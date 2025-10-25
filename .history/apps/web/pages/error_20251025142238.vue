<template>
  <div class="error-page">
    <div class="content">
      <h1>404</h1>
      <p>Oops! The page you're looking for doesn’t exist.</p>
      <NuxtLink to="/" class="home-btn">Go Back Home</NuxtLink>
    </div>
  </div>
</template>

<script setup>
// You can add custom logic here if needed
</script>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #00c9a7, #0072ff);
  color: white;
  text-align: center;
  flex-direction: column;
}

.content h1 {
  font-size: 6rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.content p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
}

.home-btn {
  background-color: white;
  color: #0072ff;
  padding: 0.8rem 1.5rem;
  border-radius: 30px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.home-btn:hover {
  background-color: #0072ff;
  color: white;
}
</style>
