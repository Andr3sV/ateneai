import { NextRequest, NextResponse } from 'next/server'
import { supabase, TABLES } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log('📥 Datos recibidos:', data)
    
    // Validar datos requeridos
    if (!data.name || !data.email || !data.company || !data.industry) {
      console.log('❌ Faltan campos requeridos:', {
        name: !!data.name,
        email: !!data.email,
        company: !!data.company,
        industry: !!data.industry
      })
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Insertar en Supabase
    console.log('🔗 Conectando a Supabase...')
    console.log('📊 Tabla:', TABLES.DEMO_LEADS)
    
    const leadData = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      industry: data.industry,
      team_size: data.teamSize,
      current_challenges: data.currentChallenges,
      expected_results: data.expectedResults,
      source: 'demo_form',
      status: 'new'
    }
    
    console.log('💾 Datos a insertar:', leadData)
    
    const { data: lead, error } = await supabase
      .from(TABLES.DEMO_LEADS)
      .insert([leadData])
      .select()

    if (error) {
      console.error('❌ Error inserting lead:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Error al guardar los datos', details: error.message },
        { status: 500 }
      )
    }
    
    console.log('✅ Lead insertado exitosamente:', lead)

    // Opcional: Enviar notificación por email
    // await sendNotificationEmail(lead[0])

    return NextResponse.json({ 
      success: true, 
      leadId: lead[0]?.id 
    })

  } catch (error) {
    console.error('Error in demo-leads API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
