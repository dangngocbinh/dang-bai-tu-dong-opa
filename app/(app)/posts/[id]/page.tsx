export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Chi tiết bài đăng</h1>
      <p className="text-gray-400 text-sm">ID: {id}</p>
      {/* TODO: Post detail + timeline — Feature 3 (TRK-002) */}
      <div className="text-gray-400 text-sm text-center py-20">
        Chi tiết bài đăng — đang phát triển (TRK-002)
      </div>
    </div>
  );
}
