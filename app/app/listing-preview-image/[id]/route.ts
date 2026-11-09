import { loadActiveListing } from "../../../lib/marketplace";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const car = await loadActiveListing(id).catch(() => null);
  if (!car?.imageUrl) return new Response(null, { status: 404 });

  return new Response(null, {
    status: 307,
    headers: {
      Location: car.imageUrl,
      "Cache-Control": "no-store",
    },
  });
}
