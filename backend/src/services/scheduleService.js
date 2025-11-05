const schedule = require('node-schedule');
const { checkOverdueReservations } = require('../controllers/tableReservationController');

class ScheduleService {
  constructor() {
    this.jobs = [];
  }

  // 初始化定时任务
  init() {
    console.log('初始化定时任务服务...');
    
    // 每5分钟检查一次超时未到的预订
    const reservationCheckJob = schedule.scheduleJob('*/5 * * * *', async () => {
      console.log('执行预订超时检查...');
      await checkOverdueReservations();
    });
    
    this.jobs.push(reservationCheckJob);
    console.log('定时任务初始化完成');
  }

  // 取消所有定时任务
  cancelAll() {
    this.jobs.forEach(job => {
      job.cancel();
    });
    this.jobs = [];
    console.log('所有定时任务已取消');
  }
}

module.exports = new ScheduleService();