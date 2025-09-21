import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { Phone, BarChart3, MessageSquare, Settings } from 'lucide-react';

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string | string[];
  label?: string;
  icon?: React.ReactNode;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
}

export interface BentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '132, 0, 255';
const MOBILE_BREAKPOINT = 768;

const cardData: BentoCardProps[] = [
  {
    color: '#060010',
    title: 'Agente de llamadas',
    description: [
      'Llama y filtra a miles de leads en minutos',
      'Sin que perciban que es una IA',
      'Soporte multiidioma con acentos locales'
    ],
    label: 'Llamadas',
    icon: <Phone className="h-8 w-8 text-white" />
  },
  {
    color: '#060010',
    title: 'CRM de gestión',
    description: [
      'Recibe leads interesados automáticamente',
      'Plataforma intuitiva y fácil de usar',
      'Facilita la conversión a clientes'
    ],
    label: 'Gestión',
    icon: <BarChart3 className="h-8 w-8 text-white" />
  },
  {
    color: '#060010',
    title: 'Agente de WhatsApp',
    description: [
      'Responde dudas instantáneamente',
      'Convierte leads en clientes potenciales',
      'Disponible 24/7 sin interrupciones'
    ],
    label: 'WhatsApp',
    icon: <MessageSquare className="h-8 w-8 text-white" />
  },
  {
    color: '#060010',
    title: 'Otras automatizaciones',
    description: [
      'Reducimos tus costes operativos',
      'Consultoría e implementación',
      'Seguimiento continuo'
    ],
    label: 'Automatización',
    icon: <Settings className="h-8 w-8 text-white" />
  }
];

const MagicBentoSolutions: React.FC<BentoProps> = ({
  textAutoHide = false,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = true,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true,
}) => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disableAnimations || !enableSpotlight) return;
    
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
    setSpotlightPosition({ x, y });
  }, [disableAnimations, enableSpotlight]);

  const handleMouseLeave = useCallback(() => {
    if (disableAnimations || !enableSpotlight) return;
    setSpotlightPosition({ x: -9999, y: -9999 });
  }, [disableAnimations, enableSpotlight]);

  return (
    <div
      className="relative w-full h-full min-h-[400px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        '--spotlight-x': `${spotlightPosition.x}px`,
        '--spotlight-y': `${spotlightPosition.y}px`,
        '--spotlight-radius': `${spotlightRadius}px`,
        '--glow-color': `rgba(${glowColor}, 0.3)`,
      } as React.CSSProperties}
    >
      {enableSpotlight && (
        <div
          className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at var(--spotlight-x) var(--spotlight-y), var(--glow-color) 0%, transparent var(--spotlight-radius))`,
            opacity: spotlightPosition.x > -9999 ? 1 : 0,
          }}
        />
      )}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
          {cardData.map((card, index) => {
            // Todas las cards tienen el mismo tamaño
            const baseClassName = `flex flex-col relative min-h-[320px] w-full p-7 rounded-[24px] border-[0.1px] border-white/20 border-solid font-light overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(0,0,0,0.2)] ${
              enableBorderGlow ? 'card--border-glow' : ''
            }`;

            const cardStyle = {
              backgroundColor: card.color || 'var(--background-dark)',
              borderColor: 'var(--border-color)',
              color: 'var(--white)',
            };

            return (
              <div
                key={index}
                className=""
                ref={(el) => {
                  if (el && enableMagnetism && !disableAnimations) {
                    el.addEventListener('mousemove', (e) => {
                      const rect = el.getBoundingClientRect();
                      const x = e.clientX - rect.left - rect.width / 2;
                      const y = e.clientY - rect.top - rect.height / 2;
                      
                      gsap.to(el, {
                        x: x * 0.1,
                        y: y * 0.1,
                        duration: 0.3,
                        ease: "power2.out"
                      });
                    });

                    el.addEventListener('mouseleave', () => {
                      gsap.to(el, {
                        x: 0,
                        y: 0,
                        duration: 0.5,
                        ease: "elastic.out(1, 0.3)"
                      });
                    });

                    if (clickEffect) {
                      el.addEventListener('click', () => {
                        gsap.to(el, {
                          scale: 0.95,
                          duration: 0.1,
                          yoyo: true,
                          repeat: 1,
                          ease: "power2.inOut"
                        });
                      });
                    }
                  }
                }}
              >
                <div className={baseClassName} style={cardStyle}>
                  {/* Icono alineado a la izquierda arriba */}
                  <div className="flex justify-start mb-6">
                    <div className="flex items-center justify-center">
                      {card.icon}
                    </div>
                  </div>
                  
                  {/* Contenido alineado a la izquierda */}
                  <div className="flex flex-col text-white">
                    <h3 className={`card__title font-normal text-lg m-0 mb-4 text-left ${textAutoHide ? 'text-clamp-1' : ''}`}>
                      {card.title}
                    </h3>
                    <div className="card__description">
                      {Array.isArray(card.description) ? (
                        <ul className="space-y-2">
                          {card.description.map((item, idx) => (
                            <li key={idx} className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 mr-3 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(182,117,255,0.4)]"></div>
                              <span className="text-sm leading-6 opacity-90">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={`text-sm leading-6 opacity-90 text-left ${textAutoHide ? 'text-clamp-3' : ''}`}>
                          {card.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .card--border-glow {
          position: relative;
        }
        
        .card--border-glow::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 0.5px;
          background: linear-gradient(45deg, rgba(182,117,255,0.45), rgba(168,85,247,0.45), rgba(182,117,255,0.45));
          border-radius: inherit;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: xor;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .card--border-glow:hover::before {
          opacity: 1;
        }
        
        .text-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .text-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .text-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default MagicBentoSolutions;