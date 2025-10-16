// Simple example JavaScript
console.log('🚀 Brail - Example Site Loaded!');

// Add some interactivity
document.addEventListener('DOMContentLoaded', () => {
  const features = document.querySelectorAll('.feature');
  
  features.forEach((feature, index) => {
    feature.style.animationDelay = `${index * 0.1}s`;
    feature.style.animation = 'fadeInUp 0.6s ease-out forwards';
  });
});

// Add CSS animation dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .feature {
    opacity: 0;
  }
`;
document.head.appendChild(style);

