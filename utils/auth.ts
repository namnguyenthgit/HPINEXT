import { createSessionClient } from "@/lib/appwrite/appwrite.actions"

// utils/auth.ts  
export async function isAdmin(): Promise<boolean> {  
  try {  
    const client = await createSessionClient()  
    const account = await client.account.get()  
    return account.labels?.includes('admin') || false  
  } catch (error) {  
    return false  
  }  
}  

export async function requireAdmin() {  
  const isUserAdmin = await isAdmin()  
  if (!isUserAdmin) {  
    throw new Error('Not authorized')  
  }  
}