// 手写promise
class XG {
  // 属于XG类的静态属性
  static PENDING = 'pending';

  static FULFILLED = 'fulfilled';

  static REJECTED = 'rejected';

  constructor(executor){
    // 设置XG初始化身上的值
    this.status = XG.PENDING;
    this.value = null;
    // 设置一个数组，将未来需要变化的状态函数存放进去
    this.callbacks = [];
    // 绑定promise,resolve,reject方法，注意这里this指向问题
    executor(this.resolve.bind(this), this.reject.bind(this));
  }
  // promise 功能捕捉
  resolve(value) {
    // 设置条件只有在pending状态下才可以改变状态
    if (this.status == XG.PENDING) {
      // 修改status状态
      this.status = XG.FULFILLED;
      this.value = value;
      // 状态为padding状态时，加入宏任务队列
      setTimeout(() => {
        // 当延迟执行resolve函数时，遍历数组，执行状态成功方法
        this.callbacks.filter(item => {
          item.onFulfilled(value)
        })
      });
    }
  }
  // promise 失败捕捉
  reject(value) {
    // 设置条件只有在pending状态下才可以改变状态
    if (this.status == XG.PENDING) {
      // 修改status状态
      this.status = XG.REJECTED;
      this.value = value;
      // 状态为padding状态时，加入宏任务队列
      setTimeout(() => {
        // 当延迟执行reject函数时，遍历数组，执行状态成功方法
        this.callbacks.filter(item => {
          item.onRejected(value)
        })
      });
    }
  }
  // 设置then函数中设置resolve,reject两个函数返回
  then(onFulfilled = () => this.value, onRejected  = () => this.value) {
    // 把返回新的promise 封装给一个对象
    let promise = new XG((resolve,reject) => {
      if (this.status == XG.PENDING) {
        // 当前状态为pending状态时，提前将onFulfilled，onRejected存放进去
        this.callbacks.push({
          onFulfilled: value => {
            this.multiplex(promise, onFulfilled(value), resolve, reject);
          },
           // 延迟后对错误的处理
          onRejected: value => {
            this.multiplex(promise, onRejected(value), resolve, reject);
          }
        })
      }
      // 设置条件只有在fulfilled状态下才可以改变状态
      if (this.status == XG.FULFILLED) {
        // 把任务加入宏任务队列中
        setTimeout(() => {
          // 由于是在宏任务当中，所以可以访问到自己。
          this.multiplex(promise, onFulfilled(this.value), resolve, reject);
        });
      }
      // 设置条件只有在rejected状态下才可以改变状态
      if (this.status == XG.REJECTED) {
        // 把任务加入宏任务队列中
        setTimeout(() => {
           // 由于是在宏任务当中，所以可以访问到自己。
          this.multiplex(promise, onRejected(this.value), resolve, reject);
        });
      }
    })
    return promise;
  }
  // 函数复用
  multiplex(promise, result, resolve, reject) {
    // 判断是否是自己本身
    if (promise == result) {
      // 主动抛出错误
      throw new TypeError("Chaining cycle detected")
    }
    // 对我们的then中的错误捕捉
    try {
      // 判断一下当前返回值是否由XG类实现，是的话他就是一个promise
      if (result instanceof XG) {
        // 调用它的then函数，改变状态，把返回值抛出
        result.then(resolve,reject)
      } else {
        resolve(result);
      }
    } catch (error) {
      reject(error)
    }
  }
  // 封装自定属性resolve方法。
  static resolve(value) {
    // 每次调用都是返回一个新的promise实例。
    return new XG((resolve, reject) => {
      // 判断传入进来的参数是不是一个prosmie，如果是调用它的then函数改变方法，否则直接成功状态返回。
      if (value instanceof XG) {
        value.then(resolve, reject)
      } else {
        // 改变当前的状态，并把传入进来的值抛出去
        resolve(value)
      }
    })
  }
  // 封装自定属性reject方法。
  static reject(value) {
    // 每次调用都是返回一个新的promise实例。
    return new XG((resolve, reject) => {
      // 判断传入进来的参数是不是一个prosmie，如果是调用它的then函数改变方法，否则直接成功状态返回。
      if (value instanceof XG) {
        value.then(resolve, reject)
      } else {
        // 改变当前的状态，并把传入进来的值抛出去
        reject(value)
      }
    })
  }
  // 封装自定属性all方法。
  static all(proArr) {
    // 创建resolve数组。
    const values = []
    // 返回一个新的promise实例
    return new XG((resolve, reject) => {
      proArr.forEach(item => {
        item.then(res => {
          // 把当前所有resolve状态下添加进去
          values.push(res)
          // 判断resolve数组添加进来的数量是不是等于传入进来的数量，等于的话，全部resolve状态抛出。
          if (values.length == proArr.length) {
            resolve(values)
          }
          // 如果传入近来有一个reject状态，就会reject状态抛出
        }, resaon => {
          reject(resaon)
        })
      })
    })
  }
  // 封装自定属性race方法。
  static race(proArr) {
    // 返回一个新的promise实例
    return new XG((resolve, reject) => {
      proArr.forEach(item => {
        item.then(res => {
            // 成功状态抛出
            resolve(res)
        }, resaon => {
          // 失败状态抛出
          reject(resaon)
        })
      })
    })
  }
}