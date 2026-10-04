import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

const MENU_CACHE_TTL = 60 * 1000;
const menuCache = new Map();

// Get menus
export const getMenus = createAsyncThunk(
  "menus/getMenus",
  async (id, { rejectWithValue }) => {
    try {
      const cached = menuCache.get(id);
      if (cached && Date.now() - cached.timestamp < MENU_CACHE_TTL) {
        return cached.value;
      }

      const response = await api.get(ENDPOINTS.CATALOGUE.STORE_MENUS(id));

      let menuData = [];
      let menuDocId = null;
      if (response.data.data && response.data.data.length > 0) {
        menuDocId = response.data.data[0]._id;
        menuData = response.data.data[0].menu;
      }

      const value = { menu: menuData, menuId: menuDocId };
      menuCache.set(id, { timestamp: Date.now(), value });
      return value;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Create menu
export const createMenu = createAsyncThunk(
  "menus/createMenu",
  async ({ restaurantId, category }, { rejectWithValue }) => {
    try {
      const body = {
        restaurant: restaurantId,
        menu: [{ category, items: [] }],
      };

      const { data } = await api.post(
        ENDPOINTS.CATALOGUE.STORE_MENUS(restaurantId),
        body,
        { headers: { "Content-Type": "application/json" } },
      );

      menuCache.delete(restaurantId);
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Add item to menu
export const addItemToMenu = createAsyncThunk(
  "menus/addItemToMenu",
  async ({ menuId, category, foodItemId, restaurantId }, { rejectWithValue }) => {
    try {
      const body = { category, foodItemId };

      const { data } = await api.patch(
        ENDPOINTS.CATALOGUE.STORE_MENU_ADD_ITEM(restaurantId, menuId),
        body,
        { headers: { "Content-Type": "application/json" } },
      );

      menuCache.delete(restaurantId);
      return data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
