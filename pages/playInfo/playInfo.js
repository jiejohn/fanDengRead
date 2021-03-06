
const app = getApp()
import tool from '../../utils/util'
import btnConfig from '../../utils/pageOtpions/pageOtpions'
import { songsUrl } from '../../utils/httpOpt/api'

Page({
  mixins: [require('../../developerHandle/playInfo')],
  data: {
    songInfo: {},
    playing: false,
    drapType: false,
    percent: 0,
    drapPercent: 0,
    playtime: '00:00',
    showList: false,
    currentId: null,
    // 开发者不传默认的按钮
    defaultBtns: [
      {
        name: 'toggle',                                          // 播放/暂停
        img: {
          stopUrl: '/images/stop2.png' ,                         // 播放状态的图标
          playUrl: '/images/play2.png'                           // 暂停状态的图标
        }
      },
    ],
    btnCurrent: null,
    noTransform: '',
    typelist: ['listLoop', 'singleLoop', 'shufflePlayback'],
    typeName: {
      "listLoop": '循环播放',
      "singleLoop": '单曲循环',
      "shufflePlayback": '随机播放',
    },
    loopType: 'listLoop',   // 默认列表循环
    likeType: 'noLike',
    total: 0,
    scrolltop: 0,
    isDrag: '',
    barWidth: 0,
    currentTime: 0,
    mainColor: btnConfig.colorOptions.mainColor,
    percentBar: btnConfig.percentBar,
    showImg: false,
    bigScreen: app.globalData.PIbigScreen,
    abumInfoName: null,
    existed: false,
    mainColor: btnConfig.colorOptions.mainColor,
    colorStyle: app.sysInfo.colorStyle,
    backgroundColor: app.sysInfo.backgroundColor,
    screen: app.globalData.screen
  },
  // 播放器实例
  audioManager: null,
  onReady: function () {
    this.animation = wx.createAnimation({
      duration: 200,
      timingFunction: 'linear'
    })
  },
  async onLoad(options) {
    // 根据分辨率设置样式
    this.setStyle()
    // 获取歌曲列表
    const canplay = wx.getStorageSync('allList')
    let abumInfoName = wx.getStorageSync('abumInfoName')
    const songInfo = app.globalData.songInfo
    console.log('songInfoexisted', songInfo.existed)
    this.setData({
      songInfo: songInfo,
      canplay: canplay,
      noPlay: options.noPlay || null,
      abumInfoName: options.abumInfoName || '',
      loopType: wx.getStorageSync('loopType') || 'listLoop'
    })
    // 把abumInfoName存在缓存中，切歌的时候如果不是专辑就播放同一首
    wx.setStorageSync('abumInfoName', options.abumInfoName)
    const nativeList = wx.getStorageSync('nativeList') || []
    let that = this, getPlayObj = {};
    if (!nativeList.length || abumInfoName !== options.abumInfoName) {
      wx.setStorageSync('nativeList', canplay)
      let [ids, urls] = [[], []],bookIdList = []
      canplay.forEach(n => {
        ids.push(n.id2)
      })
      if (wx.canIUse('getPlayInfoSync')) {
        let res = wx.getPlayInfoSync()
        if (res.playList && res.playList.length) {
            res.playList.forEach(item=>{
              if(item.title == this.data.songInfo.title){
                getPlayObj = item
              }
            })
        }
      }
      songsUrl({bookIds: ids}).then(res => {
        urls = res.data.map(n => {
          console.log(n);
          let obj = {}
          if(Object.keys(getPlayObj) && getPlayObj.title == n.bookName){
            obj = getPlayObj
          }else{
            obj.title = n.bookName
            obj.coverImgUrl = n.coverImage
            obj.dataUrl = n.mediaUrl
          }
          bookIdList.push(n.bookId)
          return obj
        })
        wx.setStorageSync('bookIdList', bookIdList)
        wx.setStorageSync('urls', urls)
        tool.initAudioManager(app, that)
      })
    }
    if (options.noPlay !== 'true') {
      let song = {
        title: options.title,
        coverImgUrl: options.src,
        id: options.id
      }
      song = Object.assign({}, app.globalData.songInfo, song)
      this.setData({songInfo: song})
      if (app.globalData.songInfo.id != options.id) wx.showLoading({ title: '加载中...', mask: true })
    }
    
  },
  onShow: function () {
    const that = this;
    const playing = wx.getStorageSync('playing')
    that.setData({playing: playing})
    this.queryProcessBarWidth()
    // 监听歌曲播放状态，比如进度，时间
    tool.playAlrc(that, app);
  },
  imgOnLoad() {
    this.setData({ showImg: true })
  },
  clack(){
    let that = this
    tool.initAudioManagers(app, that)
  },
  play() {
    let that = this
    that.setData({
      playtime: app.globalData.playtime || '00:00',
      percent: app.globalData.percent || 0,

    })
    // console.log('app.globalData.playtime', app.globalData.playtime, app.globalData.percent)
    app.playing(app.audioManager.currentTime, that)
  },
  noplay() {
    console.log('进入noplay')
    this.setData({
      playtime: app.globalData.playtime || '00:00',
      percent: app.globalData.percent || 0
    })
    // const playing = wx.getStorageSync('playing')
    // if (playing) app.playing(app.audioManager.currentTime, this)
  },
  btnsPlay(e) {
    const type = e.currentTarget.dataset.name
    if (type) this[type]()
  },
  // 上一首
  pre() {
    const that = this
    app.cutplay(that, -1)
  },
  // 下一首
  next() {
    const that = this
    app.cutplay(that, 1)
  },
  // 切换播放模式
  loopType() {
    const canplay = wx.getStorageSync('allList')
    let nwIndex = this.data.typelist.findIndex(n => n === this.data.loopType)
    let index = nwIndex < 2 ? nwIndex + 1 : 0
    app.globalData.loopType = this.data.typelist[index]
    // 根据播放模式切换currentList
    const list = this.checkLoop(this.data.typelist[index], canplay)
    wx.setStorageSync('allList', canplay)
    this.setData({
      loopType: this.data.typelist[index],
      canplay: list
    })
  },
  // 判断循环模式
  checkLoop(type, list) {
    wx.setStorageSync('loopType', type)
    wx.showToast({ title: this.data.typeName[type], icon: 'none' })
    let loopList;
    // 列表循环
    if (type === 'listLoop') {
      let nativeList = wx.getStorageSync('nativeList') || []
      loopList = nativeList        
    } else if (type === 'singleLoop') {
      // 单曲循环
      loopList = [list[app.globalData.songInfo.episode]]
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
  // 暂停/播放
  toggle() {
    const that = this
    tool.toggleplay(that, app)
  },
  // 播放列表
  more() {
    setTimeout(()=> {
      this.setScrollTop()
    }, 100)
    let allPlay = wx.getStorageSync('allList')
    this.setData({
      showList: true,
      currentId: this.data.currentId || Number(this.data.songInfo.id),
      canplay: allPlay
    })
    // 显示的过度动画
    this.animation.translate(0, 0).step()
    this.setData({
      animation: this.animation.export()
    })
    // setTimeout(() => {
    //   this.setData({
    //     noTransform: 'noTransform'
    //   })
    // }, 300)
  },
  closeList() {
    this.setData({
      showList: false,
      // noTransform: ''
    })
    // 显示的过度动画
    this.animation.translate('-180vh', 0).step()
    this.setData({
      animation: this.animation.export()
    })
  },
  // 在播放列表里面点击播放歌曲
  async playSong(e) {
    // 如果没有网
    tool.noNet(this.playSongDo, e)
  },
  async playSongDo(e) {
    let that = this
    const songInfo = e.currentTarget.dataset.song
    app.globalData.songInfo = songInfo
    songInfo.coverImgUrl = songInfo.src
    this.setData({
      songInfo: songInfo,
      currentId: app.globalData.songInfo.id,
      playing: true
    })
    // 获取歌曲详情
    let params = {fragmentId: app.globalData.songInfo.id}
    await this.getMedia(params)
    
    app.playing(null, that)
  },
  // 开始拖拽
  dragStartHandle(event) {
    console.log('isDrag', this.data.isDrag)
    this.setData({
      isDrag: 'is-drag',
      _offsetLeft: event.changedTouches[0].pageX,
      _posLeft: event.currentTarget.offsetLeft
    })
  },
  // 拖拽中
  touchmove(event) {
    let offsetLeft = event.changedTouches[0].pageX
    let process = (offsetLeft - this.data._offsetLeft + this.data._posLeft) / this.data.barWidth
    if (process < 0) {
        process = 0
    } else if (process > 1) {
        process = 1
    }
    let percent = (process * 100).toFixed(3)
    let currentTime = process * tool.formatToSend(app.globalData.songInfo.dt)
    let playtime = currentTime ? tool.formatduration(currentTime * 1000) : '00:00'
    this.setData({
      percent,
      currentTime,
      playtime
    })
  },
  // 拖拽结束
  dragEndHandle(event) {
    console.log(this.data.currentTime, this.data.percent, this.data.playtime)
    wx.seekBackgroundAudio({
      position: this.data.currentTime
    })
    setTimeout(() => {
      this.setData({isDrag: ''})
    }, 500)
  },
  // 查询processBar宽度
  queryProcessBarWidth() {
    var query = this.createSelectorQuery();
    query.selectAll('.process-bar').boundingClientRect();
    query.exec(res => {
      try {
        this.setData({
          barWidth: res[0][0].width
        })
      } catch (err) {
      }
    })
  },

  // 用slider拖拽
  sliderchange(e) {
    // console.log(e.detail.value)
    const percent = e.detail.value / 100
    const currentTime = percent * tool.formatToSend(app.globalData.songInfo.dt)
    wx.seekBackgroundAudio({
      position: currentTime
    })
    setTimeout(() => {
      this.setData({
        isDrag: ''
      })
    }, 500)
  },
  sliderchanging(e) {
    console.log(e.detail.value)
    const percent = e.detail.value / 100
    const currentTime = percent * tool.formatToSend(app.globalData.songInfo.dt)
    const playtime = currentTime ? tool.formatduration(currentTime * 1000) : '00:00'
    this.setData({
      playtime
    })
    this.setData({
      isDrag: 'is-drag'
    })
  },
  // ******按钮点击态处理********/
  btnstart(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      btnCurrent: index

    })
  },
  btend() {
    setTimeout(()=> {
      this.setData({
        btnCurrent: null
      })
    }, 150)
  },
   // ******按钮点击态处理********/
   
  // 根据分辨率判断显示哪种样式
  setStyle() {
    // 判断分辨率的比列
    const windowWidth =  wx.getSystemInfoSync().screenWidth;
    const windowHeight = wx.getSystemInfoSync().screenHeight;
    // 如果是小于1/2的情况
    if (windowHeight / windowWidth >= 0.41) {
      this.setData({
        bigScreen: false,
        leftWith: windowWidth * 0.722 + 'px',
        leftPadding: '0vh 9.8vh 20vh',
        btnsWidth: '140vh',
        imageWidth: windowWidth * 0.17 + 'px'
      })
    } else {
      // 1920*720
      this.setData({
        bigScreen: true,
        leftWith: '184vh',
        leftPadding: '0vh 12.25vh 20vh',
        btnsWidth: '165vh',
        imageWidth: '49vh'
      })
    }
  },
  // 处理scrollTop的高度
  setScrollTop() {
    let index = this.data.canplay.findIndex(n => Number(n.id) === Number(this.data.songInfo.id))
    let query = wx.createSelectorQuery();
    query.select('.songList').boundingClientRect(rect=>{
      let listHeight = rect.height;
      this.setData({
        scrolltop: index > 2 ? listHeight / this.data.canplay.length * (index - 2) : 0
      })
    }).exec();
  }
})