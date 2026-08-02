export default function AdminImportarPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Importar contenido desde Google Sheets</h1>
      <p className="text-sm text-foreground/70">
        El texto bíblico y los contextos de cada capítulo se administran en la hoja de cálculo
        &ldquo;Biblia Estudio - Repositorio&rdquo;. Cuando edites ahí los contextos (o corrijas algún
        versículo), sigue estos pasos para reflejar los cambios en la aplicación:
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/80">
        <li>Abre la hoja de cálculo y edita las pestañas correspondientes (Contextos, Versículos, etc.).</li>
        <li>
          En el menú de la hoja, ejecuta <strong>Extensiones → Apps Script → Exportar a Supabase</strong>{" "}
          (instalado junto con la plantilla).
        </li>
        <li>Confirma la ejecución; el script sincroniza únicamente las filas marcadas o modificadas.</li>
        <li>Los cambios aparecen de inmediato en la app (no requiere volver a desplegar código).</li>
      </ol>
      <p className="text-sm text-foreground/60">
        Alternativamente, un administrador técnico puede correr{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">npm run import:sheets</code> desde el
        repositorio, apuntando a la URL exportada en CSV de cada hoja.
      </p>
    </div>
  );
}
