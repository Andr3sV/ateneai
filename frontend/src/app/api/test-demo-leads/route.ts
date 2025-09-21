import { NextRequest, NextResponse } from 'next/server'
import { supabase, TABLES } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Probando conexión a Supabase...')
    console.log('📊 Tabla:', TABLES.DEMO_LEADS)
    
    // Verificar si la tabla existe
    const { data, error } = await supabase
      .from(TABLES.DEMO_LEADS)
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error accediendo a la tabla:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    }

    console.log('✅ Tabla accesible, registros encontrados:', data?.length || 0)
    
    return NextResponse.json({
      success: true,
      table: TABLES.DEMO_LEADS,
      recordCount: data?.length || 0,
      sampleData: data
    })

  } catch (error) {
    console.error('❌ Error en test:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
