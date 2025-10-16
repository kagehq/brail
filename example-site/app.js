// Simple timestamp updater
document.addEventListener('DOMContentLoaded', () => {
  const timestampElement = document.querySelector('.timestamp');
  
  if (timestampElement) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    timestampElement.textContent = `Version: 1.0.0 • Deployed: ${formattedDate}`;
  }
  
  // Add click animation to feature cards
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    card.addEventListener('click', () => {
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.style.transform = 'scale(1)';
      }, 150);
    });
  });
  
  console.log('🚀 Hello from Brail + Tailwind CSS!');
  console.log('This site was built with Tailwind CLI and deployed with Brail.');
});
