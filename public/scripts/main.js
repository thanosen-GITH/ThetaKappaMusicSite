// Minimal site JavaScript
document.addEventListener('DOMContentLoaded', () => {
  console.log('ThetaKappaMusicSite loaded');
  document.documentElement.classList.add('js-ready');
});

// Contact form handling (Formspree)
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = document.getElementById('form-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.querySelector('[name="_gotcha"]') && form.querySelector('[name="_gotcha"]').value) {
      // honeypot filled — likely spam
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    status.textContent = 'Sending...';
    try {
      const data = new FormData(form);
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        status.textContent = 'Message sent — thank you!';
        form.reset();
      } else {
        const json = await res.json().catch(() => ({}));
        status.textContent = json.error || 'Error sending message. Please try again.';
      }
    } catch (err) {
      status.textContent = 'Network error. Please try again later.';
    } finally {
      submit.disabled = false;
    }
  });
});
