export default function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Chi tiết User</h1>
      <p className="text-gray-400 text-sm">ID: {params.id}</p>
      {/* TODO: USR-001, USR-002, USR-003 */}
      <div className="text-gray-400 text-sm text-center py-20">
        Chi tiết user — đang phát triển
      </div>
    </div>
  );
}
