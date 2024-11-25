import RealtimeUsers from "@/components/RealtimeUsers";  
import { getAllUsers } from "@/lib/actions/user.actions";  

// Add this to prevent caching  
export const dynamic = 'force-dynamic';  
// Or alternatively, use revalidate  
// export const revalidate = 0;  

const UserList = async () => {  
  const users = await getAllUsers();  

  return (  
    <div>  
      <h1 className="text-3xl font-bold p-4">User Management</h1>  
      <RealtimeUsers initialUsers={users || []} />  
    </div>  
  );  
};  

export default UserList;