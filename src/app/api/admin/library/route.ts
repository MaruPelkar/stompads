import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceClient = await createServiceClient()
  const { data } = await serviceClient.from('ad_library').select().order('created_at', { ascending: false })
  return NextResponse.json({ items: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const category = formData.get('category') as string
  const prompt = formData.get('prompt') as string
  const notes = formData.get('notes') as string
  const file = formData.get('visual') as File | null

  let visualUrl: string | null = null

  if (file) {
    const serviceClient = await createServiceClient()
    const fileName = `${Date.now()}-${file.name}`
    const { data: upload } = await serviceClient.storage
      .from('ad-library')
      .upload(fileName, file)

    if (upload) {
      const { data: { publicUrl } } = serviceClient.storage
        .from('ad-library')
        .getPublicUrl(fileName)
      visualUrl = publicUrl
    }
  }

  const serviceClient = await createServiceClient()
  const { data, error } = await serviceClient
    .from('ad_library')
    .insert({ category, prompt, notes, visual_url: visualUrl })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
