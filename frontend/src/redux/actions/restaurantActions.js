import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

const RESTAURANT_CACHE_TTL = 30 * 1000;
const restaurantCache = new Map();

// Get all restaurants
export const getRestaurants = createAsyncThunk(
  "restaurants/getRestaurants",
  async (keyword, { rejectWithValue }) => {
    try {
      const cacheKey = keyword?.trim().toLowerCase() || "__all__";
      const cached = restaurantCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < RESTAURANT_CACHE_TTL) {
        return cached.value;
      }

      const params = keyword ? `?keyword=${keyword}` : "";
      const { data } = await api.get(`${ENDPOINTS.CATALOGUE.STORES}${params}`);
      const value = {
        restaurants: data.restaurants,
        count: data.count,
        foodItems: data.foodItems || [],
      };
      restaurantCache.set(cacheKey, { timestamp: Date.now(), value });
      return value;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Create restaurant - admin
export const createRestaurant = createAsyncThunk(
  "restaurants/createRestaurant",
  async (restaurantData, { rejectWithValue }) => {
    try {
      const { data } = await api.post(ENDPOINTS.CATALOGUE.STORES, restaurantData);
      restaurantCache.clear();
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Delete restaurant - admin
export const deleteRestaurant = createAsyncThunk(
  "restaurants/deleteRestaurant",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(ENDPOINTS.CATALOGUE.STORE_BY_ID(id));
      restaurantCache.clear();
      return {
        id,
        message: data.message,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Analyze reviews with AI
export const analyzeReviews = createAsyncThunk(
  "restaurants/analyzeReviews",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.put(ENDPOINTS.AI.ANALYZE_RESTAURANT(id));
      return {
        restaurantId: id,
        aiData: data.aiData,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "AI review analysis failed");
    }
  },
);
