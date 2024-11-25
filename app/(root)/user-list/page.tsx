import RealtimeUsers from "@/components/RealtimeUsers";
import { getAllUsers } from "@/lib/actions/user.actions";

const UserList = async () => {
  // Fetch initial users on the server
  const users = await getAllUsers(); // Modify your getUserInfo to fetch all users when needed

  return (
    <div>
      <h1 className="text-3xl font-bold p-4">User Management</h1>
      <RealtimeUsers initialUsers={users || []} />
    </div>
  );
};

export default UserList;
