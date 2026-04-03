// Landing Page CliniFlow - JavaScript

document.addEventListener('DOMContentLoaded', () => {
  initChat();
  initFormWizard();
  initScrollAnimations();
});

// Chat messages
const chatMessages = [
  { role: 'user', text: 'Olá! Gostaria de marcar uma consulta de cardiologia.' },
  { role: 'agent', text: 'Olá! É um prazer atendê-lo. Para qual data gostaria de agendar sua consulta?' },
  { role: 'user', text: 'Gostaria de agendar para esta sexta-feira, se possível.' },
  { role: 'agent', text: 'Perfeito! Temos horários disponíveis: 10h, 11h30 ou 14h. Qual prefere?' },
  { role: 'user', text: 'As 11h30 ficam ótimos pra mim.' },
  { role: 'agent', text: 'Consegui! Consulta marcada para sexta às 11h30. Vou enviar uma confirmação por WhatsApp. Mais alguma coisa?' },
  { role: 'user', text: 'Não, obrigado! Foi muito rápido.' },
  { role: 'agent', text: 'O prazer é nosso! Até sexta-feira, e não se esqueça de chegar 15 minutos antes. Tenha um ótimo dia! 😊' }
];

// Chat simulation
function initChat() {
  const container = document.getElementById('chat-container');
  const typingIndicator = document.getElementById('typing-indicator');
  const restartBtn = document.getElementById('restart-chat');

  if (!container) return;

  function renderMessages() {
    container.innerHTML = '';
    let delay = 0;

    chatMessages.forEach((msg) => {
      const msgEl = document.createElement('div');
      msgEl.className = `msg ${msg.role}`;
      msgEl.innerHTML = `<p>${msg.text}</p>`;
      msgEl.style.opacity = '0';

      container.appendChild(msgEl);

      setTimeout(() => {
        msgEl.style.opacity = '1';
      }, delay);

      delay += 1200;
    });
  }

  function startChat() {
    container.innerHTML = '';
    typingIndicator.style.display = 'flex';
    typingIndicator.style.opacity = '0';

    setTimeout(() => {
      typingIndicator.style.opacity = '1';
    }, 500);

    setTimeout(() => {
      typingIndicator.style.opacity = '0';
    }, 1500);

    setTimeout(() => {
      renderMessages();
    }, 2000);
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      startChat();
    });
  }

  // Auto-start after 1 second
  setTimeout(startChat, 1000);
}

// Form Wizard
function initFormWizard() {
  const steps = document.querySelectorAll('.form-step');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  const form = document.getElementById('lead-form');
  const modal = document.getElementById('success-modal');
  const closeModalBtn = document.getElementById('close-modal');

  let currentStep = 0;
  const totalSteps = steps.length;

  // DateTime input
  const datetimeInput = document.getElementById('datetime-input');
  if (datetimeInput) {
    datetimeInput.placeholder = 'Ex: Segunda-feira, 15/04 às 14h';
    datetimeInput.addEventListener('focus', () => {
      alert('Por favor, informe sua disponibilidade no formato: "Segunda-feira, 15/04 às 14h"');
    });
  }

  // Option cards click handler
  document.querySelectorAll('.option-card').forEach(card => {
    const input = card.querySelector('input');
    if (!input) return;

    card.addEventListener('click', () => {
      // Clear group if radio
      if (input.type === 'radio') {
        const name = input.name;
        document.querySelectorAll(`input[name="${name}"]`).forEach(inp => {
          inp.checked = false;
          inp.closest('.option-card')?.classList.remove('selected');
        });
      }
      // Toggle checkbox
      if (input.type === 'checkbox') {
        input.checked = !input.checked;
        card.classList.toggle('selected', input.checked);
        return;
      }
      // Select radio
      input.checked = true;
      card.classList.add('selected');
    });
  });

  // Checkbox from label click
  document.querySelectorAll('.checkbox-list label').forEach(label => {
    const input = label.querySelector('input');
    label.addEventListener('click', (e) => {
      if (e.target === input) return; // Let default handle
      input.checked = !input.checked;
      label.classList.toggle('selected', input.checked);
    });
  });

  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.toggle('active', i === index);
    });

    const progress = ((index + 1) / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${index + 1} de ${totalSteps}`;

    prevBtn.classList.toggle('hidden', index === 0);
    if (index === totalSteps - 1) {
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    }
  }

  function validateStep() {
    const step = steps[currentStep];

    // Check challenges checkboxes (step 3 - index 2)
    if (currentStep === 2) {
      const checked = step.querySelectorAll('input[name="challenges"]:checked');
      if (checked.length === 0) {
        alert('Por favor, selecione pelo menos um desafio.');
        return false;
      }
      return true;
    }

    // Check radio buttons
    const checkedInputs = step.querySelectorAll('input:checked');
    if (checkedInputs.length === 0) {
      alert('Por favor, selecione uma opção para continuar.');
      return false;
    }

    // Check datetime (last step)
    if (currentStep === 4) {
      const datetime = datetimeInput.value.trim();
      if (!datetime) {
        alert('Por favor, informe um horário para a demonstração.');
        datetimeInput.focus();
        return false;
      }
    }

    return true;
  }

  nextBtn.addEventListener('click', () => {
    if (!validateStep()) return;
    currentStep++;
    showStep(currentStep);
  });

  prevBtn.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      showStep(currentStep);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    // Log form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    console.log('Lead data:', data);

    // Show modal
    modal.classList.add('show');

    // Reset on close
    closeModalBtn.onclick = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        form.reset();
        currentStep = 0;
        showStep(currentStep);
        // Remove selected classes
        document.querySelectorAll('.option-card.selected').forEach(card => {
          card.classList.remove('selected');
        });
      }, 300);
    };
  });

  // Initialize
  showStep(0);
}

// Scroll animations
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('section, .feature-card, .problem-card').forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });
}

// Smooth scroll helpers
function scrollToForm() {
  const form = document.getElementById('form-section');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function watchDemo() {
  const chatSection = document.querySelector('.chat-demo');
  if (chatSection) {
    chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function restartChat() {
  const container = document.getElementById('chat-container');
  const typingIndicator = document.getElementById('typing-indicator');
  if (!container) return;

  container.innerHTML = '';
  typingIndicator.style.display = 'none';

  // Reinitialize chat after a short delay
  setTimeout(() => {
    const newContainer = document.getElementById('chat-container');
    const newTyping = document.getElementById('typing-indicator');
    if (newContainer && newTyping) {
      // Call initChat's startChat function logic
      const chatMessagesCopy = [...chatMessages];
      let delay = 0;

      newTyping.style.display = 'flex';
      newTyping.style.opacity = '1';

      setTimeout(() => {
        newTyping.style.opacity = '0';
        setTimeout(() => {
          newTyping.style.display = 'none';
          chatMessagesCopy.forEach((msg) => {
            const msgEl = document.createElement('div');
            msgEl.className = `msg ${msg.role}`;
            msgEl.innerHTML = `<p>${msg.text}</p>`;
            msgEl.style.opacity = '0';
            newContainer.appendChild(msgEl);

            setTimeout(() => {
              msgEl.style.opacity = '1';
            }, delay);
            delay += 1200;
          });
        }, 300);
      }, 1500);
    }
  }, 100);
}