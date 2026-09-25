import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiClient } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("query") || "";
  const [search, setSearch] = useState(initialQuery);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const notify = usePersistentToast();

  useEffect(() => {
    const query = searchParams.get("query") || "";
    setSearch(query);
    loadUsers(query);
  }, [searchParams]);

  const loadUsers = async (query) => {
    setLoading(true);
    try {
      const data = await apiClient.admin.users.list({ q: query });
      setUsers(data);
    } catch (error) {
      console.error(error);
      notify(error.message || "Failed to load users", "destructive");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchParams(search ? { query: search } : {});
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-white font-poppins font-bold text-xl">Users</h2>
          <p className="text-gray-400 text-sm">Search account records by email or user ID.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by email or user ID"
              className="pl-9 bg-gray-900 border-gray-800 text-white"
            />
          </div>
          <Button onClick={handleSearch} className="h-11">Search</Button>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['User ID', 'Name', 'Email', 'Phone', 'Address', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-500">No users found. Try a broader search.</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary break-all">{user.id}</td>
                    <td className="px-4 py-3 text-white font-medium">{user.full_name || user.name || 'User'}</td>
                    <td className="px-4 py-3 text-gray-400 break-all">{user.email}</td>
                    <td className="px-4 py-3 text-gray-400">{user.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 line-clamp-2 max-w-xs">{user.address || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 capitalize">{user.role || 'user'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <a href={`mailto:${user.email}`} className="text-primary text-xs hover:underline">Email</a>
                        <Link to={`/admin/orders?search=${encodeURIComponent(user.email)}`} className="text-primary text-xs hover:underline">Orders</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
