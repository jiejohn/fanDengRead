// import { albumFavoriteAdd } from '../../utils/httpOpt/api'
const app = getApp()

Page({
  mixins: [require('../../developerHandle/index')],
  data: {
    colorStyle: app.sysInfo.colorStyle,
    backgroundColor: app.sysInfo.backgroundColor,
    screen: app.globalData.screen,
    mainColor: app.globalData.mainColor,
    confirm: '',
    currentTap: 0,
    scrollLeft: 0,
    isFixed: false,
    showNonet: false,
  },
  scrollhandle(e) {
    if (e.detail.scrollLeft > 230) {
      this.setData({
        isFixed: true
      })
    } else {
      this.setData({
        isFixed: false
      })
    }
    
  },
  scrollRight() {
    wx.showToast({
      title: '已经到底了',
      icon: 'none'
    })
  },
  onLoad(options) {
    // let param = {
    //   "appid": '2001',
    //   "token": "20201209DDG0nnhhpPjhXkNZTwa"
    // }
    // albumFavoriteAdd(param).then(res => {
    //   console.log(res)
    // }).catch(err => {
    //   console.log(err)
    // })
    // 检测网络
    // let that = this
    // app.getNetWork(that)
  },
  onShow() {
    this.selectComponent('#miniPlayer').setOnShow()
    this.selectComponent('#miniPlayer').watchPlay()
  },
  onHide() {
    this.selectComponent('#miniPlayer').setOnHide()
  }
})