import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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

  const updateCart = (cart: Product[]) => {
    setCart(cart)
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }

  const isOutOfStock = async (productId: number, amount: number): Promise<boolean> => {
    const { data } = await api.get(`stock/${productId}`)
    if (!data)
      throw new Error()
    return data.amount < amount
  }

  const addNewProduct = async (productId: number) => {

    if (await isOutOfStock(productId, 1)) {
      return toast.error('Quantidade solicitada fora de estoque')
    }

    const { data: product } = await api.get(`products/${productId}`)
    if (!product)
      throw new Error()
    product.amount = 1
    updateCart([...cart, product])
  }

  const addProduct = async (productId: number) => {
    try {
      const productIdx = cart.findIndex(({ id }: Product) => id === productId)
      const isNewProduct = productIdx < 0
      if (isNewProduct) {
        await addNewProduct(productId)
      } else {

        await updateProductAmount({ productId, amount: cart[productIdx].amount + 1 })
      }
    } catch (e: any) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(({ id }: Product) => id !== productId)
      if (JSON.stringify(cart) === JSON.stringify(newCart))
        throw new Error()
      updateCart([...newCart])
    } catch (e: any) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return
      const productIdx = cart.findIndex(({ id }: Product) => id === productId)
      if (productIdx >= 0) {
        if (await isOutOfStock(productId, amount))
          return toast.error('Quantidade solicitada fora de estoque')
        cart[productIdx].amount = amount
        updateCart([...cart])
      } else {
        throw new Error()
      }
    } catch (e: any) {
      toast.error('Erro na alteração de quantidade do produto');
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
