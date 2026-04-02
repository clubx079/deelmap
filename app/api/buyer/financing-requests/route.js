import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// Marketplace DB: financing_requests
const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const supabaseServiceKey = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to check buyer authentication
async function checkBuyerAuth(request) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Not authenticated' };
  }

  const userId = authHeader.replace('Bearer ', '');

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { authenticated: false, error: 'Invalid or inactive session' };
    }

    return { authenticated: true, userId: user.id };
  } catch (err) {
    return { authenticated: false, error: 'Invalid session' };
  }
}

// DELETE: Remove a financing request
export async function DELETE(request) {
  try {
    const authCheck = await checkBuyerAuth(request);
    if (!authCheck.authenticated) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    // Only allow deletion of the user's own requests
    const { error } = await supabase
      .from('financing_requests')
      .delete()
      .eq('id', id)
      .eq('user_id', authCheck.userId);

    if (error) {
      console.error('Failed to delete financing request:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Financing requests DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Fetch buyer's financing requests
export async function GET(request) {
  try {
    const authCheck = await checkBuyerAuth(request);

    if (!authCheck.authenticated) {
      return NextResponse.json({
        success: false,
        error: authCheck.error
      }, { status: 401 });
    }

    // Fetch all financing requests for this user
    const { data: requests, error } = await supabase
      .from('financing_requests')
      .select('*')
      .eq('user_id', authCheck.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch financing requests:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch financing requests'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Financing requests GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
