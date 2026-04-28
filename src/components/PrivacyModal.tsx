import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface PrivacyModalProps {
  onClose: () => void;
}

export default function PrivacyModal({ onClose }: PrivacyModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h2 className="text-white font-bold text-base">Información sobre tus datos</h2>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-gray-700 leading-relaxed">

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">Responsable del tratamiento</h3>
              <p>
                Scubex es un proyecto académico desarrollado como Trabajo de Fin de Grado en la
                Universidad de Sevilla. El responsable del tratamiento es su autor,
                <strong> Iván Fernández Limárquez</strong> (ivaferlimjob@gmail.com).
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">Datos que recogemos</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>Nombre</strong> y <strong>foto de perfil</strong> de tu cuenta Google.</li>
                <li><strong>Dirección de correo electrónico</strong> de tu cuenta Google.</li>
                <li>Contenido que publiques voluntariamente: título, descripción, fotografía y coordenadas de cada inmersión.</li>
              </ul>
              <p className="mt-2 text-gray-500 text-xs">
                No recogemos contraseñas. La autenticación se delega completamente en Google mediante OAuth 2.0.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">Cómo los recogemos</h3>
              <p>
                Al iniciar sesión con Google, este nos proporciona tu nombre, correo y foto. Nunca
                accedemos a ningún otro dato de tu cuenta Google. Tus publicaciones se almacenan
                únicamente cuando tú las creas.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">Para qué los usamos</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Identificarte dentro de la app (perfil, publicaciones, comentarios).</li>
                <li>Mostrar tu nombre y foto a otros usuarios en las interacciones sociales.</li>
                <li>Enviarte notificaciones dentro de la app (likes, comentarios, menciones, nuevos seguidores).</li>
              </ul>
              <p className="mt-2 text-gray-600">
                Tus datos <strong>no se ceden ni se venden a terceros</strong> y no se usan con fines comerciales ni publicitarios.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">Base legal</h3>
              <p>
              El tratamiento se basa en tu <strong>consentimiento</strong> (
                <a
                  href="https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32016R0679#d1e1888-1-1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 underline"
                >
                  art.&nbsp;6.1.a RGPD
                </a>
              ), que otorgas
                al iniciar sesión por primera vez en la aplicación.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">Cuánto tiempo los conservamos</h3>
              <p>
                Tus datos se conservan mientras tengas una cuenta activa en Scubex. Puedes eliminar tu
                cuenta en cualquier momento desde tu página de perfil, lo que suprimirá de forma
                permanente todos tus datos y publicaciones.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">Tus derechos</h3>
              <p className="mb-1">De acuerdo con el RGPD tienes derecho a:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>Acceso</strong>: consultar qué datos tenemos sobre ti.</li>
                <li><strong>Rectificación</strong>: corregir tus datos desde la página de perfil.</li>
                <li><strong>Supresión</strong>: eliminar tu cuenta y todos tus datos desde la página de perfil.</li>
                <li><strong>Portabilidad</strong>: solicitar una copia de tus datos.</li>
                <li><strong>Oposición y limitación</strong>: oponerte al tratamiento o solicitar su limitación.</li>
              </ul>
              <p className="mt-2">
                Para ejercer cualquiera de estos derechos escríbenos a{' '}
                <a href="mailto:ivaferlimjob@gmail.com" className="text-cyan-600 underline">ivaferlimjob@gmail.com</a>.
                También puedes presentar una reclamación ante la{' '}
                <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-cyan-600 underline">
                  Agencia Española de Protección de Datos (AEPD)
                </a>.
              </p>
            </section>

            <p className="text-xs text-gray-400 border-t pt-3">
              Última actualización: abril de 2026 · Scubex — Proyecto académico, Universidad de Sevilla
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
