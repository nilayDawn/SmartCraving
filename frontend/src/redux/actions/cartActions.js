//fetch cart
//Add items
//update quantity
//remove items
//handle loading and  errors

import api from "../../utils/api"
import {
     cartRequest,
    cartSuccess,
    cartFail,
    updateCartSuccess,
    removeCartSuccess,
} from "../slices/cartSlice"

//fetch cart items

export const fetchCartItems =() =>async(dispatch) =>{
    try{
       dispatch(cartRequest());

       const {data} = await api.get("/v1/eats/cart/get-cart");

       dispatch(cartSuccess(data.data))
    }catch(error){
            dispatch(cartFail(error.response?.data?.message))
    }
}

//add cart items
export const addItemToCart =(foodItemId, restaurantId, quantity) =>async(dispatch) =>{
    try{
         dispatch(cartRequest());

         const{data} = await api.post("/v1/eats/cart/add-to-cart" ,{
            foodItemId,
            restaurantId,
            quantity
         })

         dispatch(cartSuccess(data.cart))
         return data.cart;
    }catch(error){
        dispatch(cartFail(error.response?.data?.message))
        return null;
    }
}

//update cart quantity

export const updateCartQuantity = (foodItemId,quantity) => async(dispatch) =>{
    try{
       const {data} = await api.post("/v1/eats/cart/update-cart-item", {
        foodItemId,
        quantity
       })

       dispatch(updateCartSuccess(data.cart))
    }catch(error){
          dispatch(cartFail(error.response?.data?.message))
    }
}

//remove item from cart
export const removeItemFromCart = (foodItemId) => async(dispatch) =>{
    try{
        const {data} = await api.delete("/v1/eats/cart/delete-cart-item", {
            data:{foodItemId}
        })

        dispatch(removeCartSuccess(data))

    }catch(error){
         dispatch(cartFail(error.response?.data?.message))
    }
}
