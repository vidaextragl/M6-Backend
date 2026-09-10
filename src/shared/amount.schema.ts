import { z } from 'zod';

// Los montos se guardan en columnas `decimal(18,2)` (balances, transacciones): hasta 16 dígitos
// enteros + 2 decimales. Sin este tope, un monto con más dígitos de los que la columna soporta
// no lo frena la validación y explota como un error de Postgres sin manejar ("numeric field
// overflow"), que termina devolviendo un 500 genérico en vez de un 400 claro.
export const amountSchema = z
  .string()
  .regex(
    /^\d{1,16}(\.\d{1,2})?$/,
    'Amount must be a positive number with up to 16 digits and up to 2 decimal places',
  )
  .refine((val) => Number(val) > 0, { message: 'Amount must be greater than 0' });
