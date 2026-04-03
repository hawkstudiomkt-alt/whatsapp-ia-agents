/**
 * Landing Page CliniFlow
 * JavaScript para animações, formulário interativo e chat simulado
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize components
  initChatSimulation();
  initFormWizard();
  initScrollAnimations();
  initSmoothScroll();
});

/* ========================================
   Chat Simulation
   ======================================== */

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

function initChatSimulation() {
  const container = document.getElementById('chat-container');
  const typingIndicator = document.getElementById('typing-indicator');
  const restartBtn = document.getElementById('restart-chat');

  if (!container) return;

  function renderChat() {
    container.innerHTML = '';
    let delay = 0;

    chatMessages.forEach((msg, index) => {
      const messageElement = document.createElement('div');
      messageElement.className = `flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`;
      messageElement.style.opacity = '0';

      const bubble = document.createElement('div');
      bubble.className = `rounded-2xl p-4 max-w-xs ${msg.role === 'user' ? 'bg-gradient-to-r from-primary to-accent rounded-tr-none' : 'bg-white/10 rounded-tl-none'}`;
      bubble.innerHTML = `<p class="text-sm">${msg.text}</p>`;

      messageElement.appendChild(bubble);
      container.appendChild(messageElement);

      // Staggered animation
      setTimeout(() => {
        messageElement.style.transition = 'opacity 0.5s ease';
        messageElement.style.opacity = '1';
      }, delay);

      // Simulate typing after previous message (except agent typing indicator shown after user)
      delay += 1200;
    });
  }

  function startChat() {
    container.innerHTML = '';
    typingIndicator.style.display = 'flex';
    typingIndicator.style.opacity = '0';
    typingIndicator.style.transition = 'opacity 0.3s';

    // Show typing indicator initially
    setTimeout(() => {
      typingIndicator.style.opacity = '1';
    }, 500);

    // After short wait, hide typing and render first user message
    setTimeout(() => {
      typingIndicator.style.opacity = '0';
    }, 1000);

    // Begin rendering messages sequentially
    renderChat();
  }

  restartBtn.addEventListener('click', () => {
    restartBtn.disabled = true;
    startChat();
    setTimeout(() => {
      restartBtn.disabled = false;
    }, 3000);
  });

  // Start automatically after a short delay
  setTimeout(startChat, 1000);
}

/* ========================================
   Form Wizard with Animations
   ======================================== */

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

  // Custom datetime picker fallback
  const datetimeInput = document.getElementById('datetime-input');
  if (datetimeInput) {
    datetimeInput.type = 'text';
    datetimeInput.placeholder = 'Ex: Segunda-feira, 15/04 às 14h';
    datetimeInput.addEventListener('focus', () => {
      alert('Por favor, informe sua disponibilidade no formato: "Segunda-feira, 15/04 às 14h"');
    });
  }

  // Option cards selection
  const optionCards = document.querySelectorAll('.option-card');
  optionCards.forEach(card => {
    const input = card.querySelector('input');
    if (!input) return;

    card.addEventListener('click', () => {
      // Clear group
      const name = input.name;
      if (input.type === 'radio') {
        document.querySelectorAll(`input[name="${name}"]`).forEach(i => {
          i.checked = false;
          i.closest('.option-card')?.classList.remove('selected');
        });
      }
      // Select this
      input.checked = true;
      card.classList.add('selected');
    });

    // Add selected style
    if (input.checked) {
      card.classList.add('selected');
    }
  });

  // Step navigation
  function updateStep() {
    // Hide all steps, show current
    steps.forEach((step, index) => {
      step.classList.toggle('hidden', index !== currentStep);
      if (index === currentStep) {
        step.classList.remove('hidden');
        // Animate in
        step.style.opacity = 0;
        step.style.transform = 'translateX(20px)';
        setTimeout(() => {
          step.style.transition = 'all 0.4s ease';
          step.style.opacity = 1;
          step.style.transform = 'translateX(0)';
        }, 50);
      }
    });

    // Update progress
    const progress = ((currentStep + 1) / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${currentStep + 1} de ${totalSteps}`;

    // Button visibility
    prevBtn.classList.toggle('hidden', currentStep === 0);
    if (currentStep === totalSteps - 1) {
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    }
  }

  function validateStep() {
    const currentStepEl = steps[currentStep];
    const requiredInputs = currentStepEl.querySelectorAll('input[required], input:checked');
    if (currentStep === 2) {
      // challenges checkboxes: at least one required
      const checked = currentStepEl.querySelectorAll('input[name="challenges"]:checked');
      if (checked.length === 0) {
        alert('Por favor, selecione pelo menos um desafio.');
        return false;
      }
      return true;
    }

    // For steps with radio selection
    const selected = currentStepEl.querySelectorAll('input:checked');
    if (selected.length === 0) {
      alert('Por favor, selecione uma opção para continuar.');
      return false;
    }

    // For last step, datetime required
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
    updateStep();
  });

  prevBtn.addEventListener('click', () => {
    currentStep--;
    updateStep();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    // Simulate form submission
    const formData = new FormData(form);
    console.log('Lead data:', Object.fromEntries(formData));

    // Show success modal with animation
    modal.style.pointerEvents = 'auto';
    modal.classList.remove('opacity-0');
    const modalContent = modal.querySelector('div');
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');

    // Reset form after closing
    closeModalBtn.onclick = () => {
      modal.classList.add('opacity-0');
      modal.classList.remove('scale-100');
      modal.classList.add('scale-95');
      setTimeout(() => {
        modal.style.pointerEvents = 'none';
        form.reset();
        currentStep = 0;
        updateStep();
      }, 300);
    };
  });

  // Initialize
  updateStep();
}

/* ========================================
   Scroll Animations
   ======================================== */

function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe sections
  document.querySelectorAll('section').forEach(section => {
    section.style.opacity = 0;
    observer.observe(section);
  });

  // Feature cards and problem cards cascade
  const cards = document.querySelectorAll('.feature-card, .problem-card');
  cards.forEach((card, index) => {
    card.style.opacity = 0;
    card.style.animationDelay = `${index * 100}ms`;
    observer.observe(card);
  });
}

/* ========================================
   Smooth Scroll & CTA interactions
   ======================================== */

function initSmoothScroll() {
  const ctaButtons = document.querySelectorAll('button[id$="-cta"]');
  const formSection = document.getElementById('form-section');

  ctaButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Add dynamic selection styling for option cards
  const style = document.createElement('style');
  style.textContent = `
    .option-card.selected .bg-white\/5 {
      background: rgba(37, 99, 235, 0.2) !important;
      border-color: rgba(37, 99, 235, 0.8) !important;
    }
  `;
  document.head.appendChild(style);
}