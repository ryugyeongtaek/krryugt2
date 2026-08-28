import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  await requireAdmin('/admin/forecast-runs');
  const serviceUrl = process.env.PYTHON_FORECAST_SERVICE_URL;
  if (!serviceUrl) return NextResponse.json({ error: 'PYTHON_FORECAST_SERVICE_URL_REQUIRED' }, { status: 503 });
  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/forecast/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(await request.json()), cache: 'no-store' });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'PYTHON_FORECAST_SERVICE_UNAVAILABLE' }, { status: 503 }); }
}
