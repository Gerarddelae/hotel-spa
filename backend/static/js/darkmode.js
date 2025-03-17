document.addEventListener('DOMContentLoaded', () => {
  // Creamos el MutationObserver para observar cambios en el DOM
  const observer = new MutationObserver((mutationsList, observer) => {
      // Buscamos el switch de modo oscuro
      const switchElement = document.getElementById('darkModeSwitch');
      if (switchElement) {
          // Una vez que encontramos el switch, dejamos de observar
          observer.disconnect();

          // Lógica para el tema oscuro
          const htmlElement = document.body;
          const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
          const currentTheme = localStorage.getItem('bsTheme') || (prefersDarkScheme ? 'dark' : 'light');

          // Establecemos el tema en el atributo 'data-bs-theme' del <html>
          htmlElement.setAttribute('data-bs-theme', currentTheme);
          
          // Aseguramos que el checkbox esté en el estado correcto
          switchElement.checked = currentTheme === 'dark';

          // Cambiar el tema cuando se cambie el estado del interruptor
          switchElement.addEventListener('change', function () {
              const newTheme = this.checked ? 'dark' : 'light';
              htmlElement.setAttribute('data-bs-theme', newTheme);  // Actualizamos el tema en el <html>
              localStorage.setItem('bsTheme', newTheme);  // Guardamos la preferencia en localStorage
          });

      }
  });
  // Configurar el observer para observar el cuerpo del documento y sus cambios
  observer.observe(document.body, { childList: true, subtree: true });
});
