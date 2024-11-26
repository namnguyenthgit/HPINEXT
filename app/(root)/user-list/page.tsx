// app/(root)/user-list/page.tsx

import RealtimeUsers from "@/components/RealtimeUsers";
import { getAllUsers } from "@/lib/actions/user.actions";

// Ensure server-side rendering
export const dynamic = "force-dynamic";

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
