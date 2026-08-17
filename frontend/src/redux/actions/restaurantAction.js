//user opens app
//we need restaurant data from Backend
//API call happens
//data stored in redux
//UI updates automatically

import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

//get all restaurants
export const getRestaurants = createAsyncThunk(
    "restaurants/getRestaurants",async(keyword,{rejectWithValue}) =>{
       try{
        //API call — only send keyword param if one was provided
        const params = keyword ? `?keyword=${keyword}` : "";
        const {data} = await api.get(`/v1/eats/stores${params}`);
        return {
            restaurants : data.restaurants,
            count : data.count,
        }
       }catch(error){
         return rejectWithValue(error.response?.data?.message || error.message);
       }
    })

 //create restaurant - admin
 
 export const createRestaurant = createAsyncThunk(
  "restaurants/createRestaurant", async(restaurantData,{rejectWithValue}) =>{
    try{
      const {data} = await api.post("/v1/eats/stores", restaurantData);
      return data;
    }catch(error){
        return rejectWithValue(error.response?.data?.message || error.message)
    }

  }
 )

 //delete restaurant

  export const deleteRestaurant = createAsyncThunk(
  "restaurants/deleteRestaurant", async(id,{rejectWithValue}) =>{
    try{
      const {data} = await api.delete(`/v1/eats/stores/${id}`);
      return {
        id,
        message:data.message
      };
    }catch(error){
        return rejectWithValue(error.response?.data?.message || error.message)
    }

  }
 )

 export const analyzeReviews = createAsyncThunk(
  "restuarants/analyzeReviews", async(id, {rejectWithValue}) =>{
    try{
      const {data} = await api.put(`/v1/ai/admin/restaurants/${id}/analyze`)

      return{
        restaurantId: id,
        aiData:data.aiData
      }

    }catch(error){
      return rejectWithValue(error.response?.data?.message || "AI failed")

    }
  }
 )

