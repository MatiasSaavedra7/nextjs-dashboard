'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State ,formData: FormData) {
  // Validar Formulario utilizando Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })
  
  // Si la validacion del formulario falla, retorna un error, de otra forma, continua el flujo
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice',
    };
  }


  // Preparar la informacion para insertar en la base de datos
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  // Insertar la informacion en la base de datos
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    // Por ahora, vamos a mostrar el error por consola (del navegador)
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  // Limpia la informacion almacenada en cache y realiza una nueva solicitud a la ruta especificada
  revalidatePath('/dashboard/invoices');
  // Una vez actualizada la base de datos, se volverá a validar la ruta /dashboard/invoices y se obtendrán datos nuevos del servidor.

  // En este punto, también querrá redirigir al usuario a la página /dashboard/invoices. Puede hacerlo con la función de redirect de Next.js
  redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;
  
  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error(error);
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
};

export async function deleteInvoice(id: string) {
  throw new Error('Failed to Delete Invoice');

  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {

  // console.log("Login form data: ", formData);
  
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    
    throw error;
  }
}