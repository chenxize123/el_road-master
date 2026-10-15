<!--
 * @Date         : 2026-05-08 21:14:54
 * @Description  : 
 * @FilePath     : DashboardBanner.vue
 * @LastEditTime : 2026-05-08 21:16:27
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved. 
 * 2026-05-08 21:14:54
-->
<template>
  <section class="dashboard-banner">
    <div class="banner-content">
      <h1>欢迎来到大模型智慧助教系统“子路”</h1>
      <p>WELCOME TO THE SMART TEACHING ASSISTANT SYSTEM</p>
    </div>
  </section>
</template>

<style scoped>
.dashboard-banner {
  width: 100%;
  min-height: 190px;
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(220, 242, 255, 0.9), rgba(220, 242, 255, 0.45)),
    url('@/assets/images/dashboard-banner.png') center / cover no-repeat;
}

.banner-content {
  padding: 54px 10%;
}

.banner-content h1 {
  margin: 0 0 16px;
  font-size: clamp(30px, 4vw, 52px);
  line-height: 1.2;
  font-weight: 800;
  color: #4f7cff;
  text-shadow: 2px 2px 0 #fff;
}

.banner-content p {
  margin: 0;
  font-size: 20px;
  color: #555;
}

/* 平板端 */
@media screen and (max-width: 900px) {
  .banner-content {
    padding: 44px 6%;
  }

  .banner-content p {
    font-size: 18px;
  }
}

/* 手机端 */
@media screen and (max-width: 768px) {
  .dashboard-banner {
    min-height: 150px;
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .banner-content {
    padding: 36px 24px;
  }

  .banner-content h1 {
    font-size: 28px;
  }

  .banner-content p {
    font-size: 14px;
  }
}

/* 小屏手机 */
@media screen and (max-width: 480px) {
  .dashboard-banner {
    min-height: 130px;
  }

  .banner-content {
    padding: 28px 16px;
  }

  .banner-content h1 {
    font-size: 24px;
    margin-bottom: 12px;
  }

  .banner-content p {
    font-size: 12px;
  }
}
</style>