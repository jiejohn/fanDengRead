import btnConfig from './utils/pageOtpions/pageOtpions'
import { getMedia } from './developerHandle/playInfo'

require('./utils/minixs')

App({
  globalData: {
    // 登录状态
    isLogin: false,
    taiLogin: false,
    isVip: false,
    isAgree: false,
    bgShow: false,
    appName: 'fandengbook',
    // 屏幕类型
    screen: '',
    mainColor: btnConfig.colorOptions.mainColor,
    appId: '60180',
    indexData: [], // 静态首页数据
    latelyListenId: [], // 静态记录播放id
    abumInfoData: [],
    playing: false,
    percent: 0,
    curplay: {},
    globalStop: true,
    currentPosition: 0,
    canplay: [],
    currentData: [],
    loopType: 'listLoop', // 默认列表循环
    useCarPlay: wx.canIUse('backgroundAudioManager.onUpdateAudio'),
    PIbigScreen: null,
    userInfo: {
      avatar: '/images/asset/mine_no_login.png',
      nickname: '未登录',
      vipState: 0, // 0 非会员， 1 会员快过期（不到一个月）， 2 会员有效
      vipEndTime: '',
      phoneNumber: ''
    },
    // 权限信息
    auth: { 
      openid: '',
      unionId: '',
      sessionId: ''
    },
    playingId: '' // 正在播放歌曲id
  },
  
  // 小程序颜色主题
  sysInfo: {
    colorStyle: 'dark',
    backgroundColor: 'transparent',
    defaultBgColor: '#151515'
  },
  audioManager: null,
  currentIndex: null,
  onLaunch: function () {
    // 初次进入判断
    this.globalData.userInfo = {
      avatar: wx.getStorageSync('avatarU') || '/images/asset/mine_no_login.png',
      nickname: wx.getStorageSync('nickname'),
      vipState: wx.getStorageSync('vipState'),
      vipEndTime: wx.getStorageSync('vipEndTime')
    }
    this.globalData.isLogin = wx.getStorageSync('isLogin')
    this.globalData.isVip = wx.getStorageSync('isVip')

    // 获取小程序颜色主题
    this.getTheme()
    // 判断playInfo页面样式，因为这里最快执行所以放在这
    this.setStyle()
    this.audioManager = wx.getBackgroundAudioManager()
    
    // 判断横竖屏
    if (wx.getSystemInfoSync().windowWidth > wx.getSystemInfoSync().windowHeight) {
      this.globalData.screen = 'h'
    } else {
      this.globalData.screen = 'v'
    }
    // myPlugin.injectWx(wx)
    // 关于音乐播放的
    var that = this;
    //播放列表中下一首
    wx.onBackgroundAudioStop(function () {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      that.cutplay(currentPage, 1, true)
    });
    //监听音乐暂停，保存播放进度广播暂停状态
    wx.onBackgroundAudioPause(function () {
      wx.getBackgroundAudioPlayerState({
        complete: function (res) {
          that.globalData.currentPosition = res.currentPosition ? res.currentPosition : 0
        }
      })
    });
    wx.setStorageSync('playing', false)
    if (wx.canIUse('getShareData')) {
      wx.getShareData({
        name: that.globalData.appName,
        success: (res) => {
          let playing = res.data.playStatus
          wx.setStorageSync('playing', playing)
        }
      })
    }
    // 测试getPlayInfoSync
    if (wx.canIUse('getPlayInfoSync')) {
      let res = wx.getPlayInfoSync()
    }
  },
  vision: '1.0.0',
  cutplay: async function (that, type, cutFlag) {
    // 判断循环模式
    let allList = wx.getStorageSync('nativeList')
    // 根据循环模式设置数组
    let loopType = wx.getStorageSync('loopType') || 'listLoop'
    // 歌曲列表
    allList = this.setList(loopType, allList, cutFlag)
    // 当前歌曲的索引
    let no = allList.findIndex(n => Number(n.id) === Number(this.globalData.songInfo.id))
    
    let index = this.setIndex(type, no, allList)
    console.log('index', index, allList, this.globalData.songInfo)
    //歌曲切换 停止当前音乐
    let song = allList[index] || allList[0]
    song.coverImgUrl = song.src
    wx.pauseBackgroundAudio();
    that.setData({
      currentId: Number(song.id),       // 当前播放的歌曲id
      currentIndex: index,
      songInfo: song
    })
    // 获取歌曲的url
    let params = {
      fragmentId: song.id
    }
    console.log(params)
    await getMedia(params, that)
    loopType === 'singleLoop' ? this.playing(0) : this.playing()
  },
  // 根据循环模式设置播放列表
  setList(loopType, list, cutFlag = false){
    let loopList = []
    // 列表循环
    if (loopType === 'listLoop') {
      loopList = list     
    } else if (loopType === 'singleLoop') {
      // 单曲循环
      loopList = cutFlag ? [this.globalData.songInfo] : list
    } else {
      // 随机播放
      loopList = this.randomList(list)
    }
    return loopList
  },
  // 打乱数组
  randomList(arr) {
    let len = arr.length;
    while (len) {
        let i = Math.floor(Math.random() * len--);
        [arr[i], arr[len]] = [arr[len], arr[i]];
    }
    return arr;
  },
  // 根据循环模式设置切歌的index,cutFlag为true时说明是自然切歌
  setIndex(type, no, list) {
    let index
    if (type === 1) {
      index = no + 1 > list.length - 1 ? 0 : no + 1
    } else {
      index = no - 1 < 0 ? list.length - 1 : no - 1
    }
    return index
  },
  // 暂停音乐
  stopmusic: function () {
    wx.pauseBackgroundAudio();
  },
  // 根据歌曲url播放歌曲
  playing: function (seek, cb) {
    const songInfo = this.globalData.songInfo
    console.log('songInfo', songInfo)
    // 如果是车载情况
    if (this.globalData.useCarPlay) {
      console.log('车载播放')
      this.carHandle(seek)
    } else {
      console.log('小程序播放')
      this.wxPlayHandle(songInfo, seek, cb)
    }

  },
  // 车载情况下的播放
  carHandle(seek) {
    let media = this.globalData.songInfo || wx.getStorageSync('songInfo')
    this.audioManager.src = media.src
    this.audioManager.title = media.title
    this.audioManager.coverImgUrl = media.coverImgUrl
    if (seek != undefined && typeof (seek) === 'number') {
      wx.seekBackgroundAudio({
        position: seek
      })
    }
  },
  // 非车载情况的播放
  wxPlayHandle(songInfo, seek, cb) {
    wx.playBackgroundAudio({
      dataUrl: songInfo.src,
      title: songInfo.title,
      success: function (res) {
        if (seek != undefined && typeof (seek) === 'number') {
          wx.seekBackgroundAudio({
            position: seek
          })
        };
        cb && cb();
      },
      fail: function () {
      }
    })
  },
  // 获取网络信息，给出相应操作
  getNetWork(that) {
    // 监听网络状态
    let pages = getCurrentPages()
    let currentPage = pages[pages.length - 1]
    wx.onNetworkStatusChange(res => {
      const networkType = res.isConnected
      if (!networkType) {
        that.setData({showNonet: true})
        wx.hideLoading()
      } else {
        that.setData({showNonet: false})
        currentPage.onLoad(currentPage.options)
      }
    })
  },
  // 根据分辨率判断显示哪种样式
  setStyle() {
    // 判断分辨率的比列
    const windowWidth = wx.getSystemInfoSync().screenWidth;
    const windowHeight = wx.getSystemInfoSync().screenHeight;
    // 如果是小于1/2的情况
    if (windowHeight / windowWidth >= 0.41) {
      this.globalData.PIbigScreen = false
    } else {
      // 1920*720
      this.globalData.PIbigScreen = true
    }
  },
  // 获取颜色主题
  getTheme: function () {
    if (wx.canIUse("getColorStyle")) {
      wx.getColorStyle({
        success: (res) => {
          this.sysInfo.colorStyle = res.colorStyle
          this.sysInfo.backgroundColor = res.backgroundColor
          this.globalData.themeLoaded = true
          // this.initTabbar()
        },
        fail: (res) => {
          this.log('配色加载失败')
          this.sysInfo.backgroundColor = this.sysInfo.defaultBgColor
          this.globalData.themeLoaded = true
          // this.initTabbar()
        }
      })
    } else{
      this.sysInfo.backgroundColor = this.sysInfo.defaultBgColor
      this.globalData.themeLoaded = true
      // this.initTabbar()
    }
    if(wx.canIUse('onColorStyleChange')){
      wx.onColorStyleChange((res) => {
        this.sysInfo.colorStyle = res.colorStyle
        this.sysInfo.backgroundColor = res.backgroundColor
        wx.setTabBarStyle({
          color: res.colorStyle == 'dark'?'#FFFFFF':'#c4c4c4'
        })
      })
    }
  },
  // 设置页面配色
  setTheme(page) {
    if (this.globalData.themeLoaded) {
      page.setData({
        colorStyle: this.sysInfo.colorStyle,
        backgroundColor: this.sysInfo.backgroundColor
      })
    } else {
      this.watch(page, 'themeLoaded', val => {
        if (val) {
          page.setData({
            colorStyle: this.sysInfo.colorStyle,
            backgroundColor: this.sysInfo.backgroundColor
          })
        }
      })
    }
    if(wx.canIUse('onColorStyleChange')){
      wx.onColorStyleChange((res) => {
        this.sysInfo.colorStyle = res.colorStyle
        this.sysInfo.backgroundColor = res.backgroundColor
        page.setData({
          colorStyle: this.sysInfo.colorStyle,
          backgroundColor: this.sysInfo.backgroundColor
        })
      })
    }
  },
  
})