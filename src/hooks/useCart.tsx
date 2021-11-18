import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const isOutOfStock = async (productId: number, amount: number): Promise<boolean> => {
    const { data } = await api.get('stock')
    const product = data.find(({ id }: Product) => id === productId)
    return product.amount < amount
  }

  const addNewProduct = async (productId: number) => {

    if (await isOutOfStock(productId, 1))
      throw new Error('Quantidade solicitada fora de estoque')

    const { data } = await api.get('products')
    const product = data.find(({ id }: Product) => id === productId)
    product.amount = 1
    console.log('Novo', cart, product)
    setCart([...cart, product])
  }

  const addProduct = async (productId: number) => {
    try {
      const productIdx = cart.findIndex(({ id }: Product) => id === productId)
      const isNewProduct = productIdx < 0
      if (isNewProduct) {
        addNewProduct(productId)
      } else {
        updateProductAmount({ productId, amount: 1 })
      }
    } catch (e) {
      console.log(e)
      // TODO
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(({ id }: Product) => id !== productId)
      setCart([...newCart])
      console.log("chamei rem", newCart)
    } catch {
      // TODO
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (await isOutOfStock(productId, 1))
        throw new Error('Quantidade solicitada fora de estoque')

      const productIdx = cart.findIndex(({ id }: Product) => id === productId)
      console.log(productIdx)
      if (productIdx >= 0) {
        cart[productIdx].amount += amount
        console.log('Novo', cart, productIdx)
        setCart([...cart])
      }
      console.log("chamei update")
    } catch (e) {
      console.log(e)
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
