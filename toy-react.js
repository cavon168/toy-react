const RENDER_TO_DOM = Symbol('render to dom');

// 实现继承：承包了ElementWrepper()、TextWrepper()里面的逻辑
export class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
    this._range = null;
  }
  setAttribute(name, value) {
    this.props[name] = value;
  }
  appendChild(component) {
    this.children.push(component);
  }
  // 由render决定
  get vdom() {
    return this.render().vdom;
  }
  /**
   * 位置：range API重新操作渲染
   * 私有函数
   * @description 每次把Component创建出来，然后去给它render，需要调用到具体的位置。如果指定element是不够精确的，因为可能是在element的中间，要重新渲染，就不一定是插到最后了
   */
  // 相当于一个变量放在[]里面
  [RENDER_TO_DOM](range) {
    // 存range， 改变了range值
    this._range = range;
    // 重要知识：RENDER_TO_DOM的逻辑render了之后一定要更新，
    // 所以就会给这个RENDER_TO_DOM里面的当时用的vdom存下来
    // 会重新render并且得到一棵新的vdom树
    this._vdom = this.vdom; // 充当旧的vdom
    // 给root做更新：私有函数
    this._vdom[RENDER_TO_DOM](range);
  }
  // 实现vdom的比对：把一棵新的vdom跟上次渲染得到的旧vdom去做一个对比，然后决定哪一个树的子树去做重新渲染
  update() {
    // 此处会用一个比较简单的vdom对比算法，只对比对应位置的vdom是不是同一个类型的节点，如果是就进行了，
    // 如果不是，比如说两个节点调换了顺序，这个react里面是可以处理的，会用一个更好的vdom对比算法
    // 递归的去访问vdom的内容

    // 根节点对比函数处理
    let isSameNode = (oldNode, newNode) => {
      // 1.对比根节点type，如果type不同就认为是两个完全不同的类型子节点
      // 2.props，可以通过打patch的方式去更改，因为vdom树里面全是ElementWrapper老实的节点，所以不会有什么特殊的逻辑，可以把这个props打patch,
      // 如果props不一样它的根节点不一样，只有根节点的type和props完全一致，那么根节点是不需要更新的，然后再去看所有的子节点是不是需要更新
      // 3.children
      // 4.#text/content，可以去通过打patch的方式更新，replace()方式
      // 最终：对比type和对比children(各种各样不同的Diff算法) --> 同位置比较实现局部更新

      // 1.类型不同
      if (oldNode.type !== newNode.type) {
        return false;
      }
      // 2.节点不同
      for (let name in newNode.props) {
        if (newNode.props[name] !== oldNode.props[name]) {
          return false;
        }
      }
      // 3.旧的属性比新的属性多
      if (Object.keys(oldNode.props).length > Object.keys(newNode.props).length) {
        return false;
      }
      // 4.文本节点（content）
      if (newNode.type === '#text') {
        if (newNode.content !== oldNode.content) {
          return false;
        }
      }
      return true;
    }
    let update = (oldNode, newNode) => {
      // 如果不是一样的Node，直接对oldNode做一个覆盖
      if (isSameNode(oldNode, newNode)) {
        // 怎么覆盖？把oldNode的range取出来替换掉
        newNode[RENDER_TO_DOM](oldNode._range);
        // 等于一个完全的全新渲染
        return;
      }
      // 如果新旧节点一样，就会强行将oldNode设置为newNode的range
      newNode._range = oldNode._range;
      // newNode.children属性里面放的是Component，此时需要一个vchildren
      let newChildren = newNode.children;
      // 也需要一个vchildren，靠get vdom逻辑取出来的
      let oldChildren = oldNode.children;

      if (!newChildren || !newChildren.length) {
        return;
      }

      // 初始化等于oldChildren的最后一个将range设到_range的尾巴上
      let tailRange = oldChildren[oldChildren.length - 1]._range;
      
      // 双数组同时循环
      for (let i = 0; i < newChildren.length; i++) {
        let newChild = newChildren[i];
        let oldChild = oldChildren[i];
        if (i < oldChild.length) {
          update(oldChild, newChild);
        } else {
          // 插入的range
          let range = document.createRange();
          // 插入的range会用tailRange的尾巴，所以start、end都会设成tailRange
          range.setStart(tailRange.endContainer, tailRange.endOffset);
          range.setEnd(tailRange.endContainer, tailRange.endOffset);
          newChild[RENDER_TO_DOM](range);
          // 继续追加
          tailRange = range;
        }
      }

    }
    let vdom = this.vdom;
    update(this._vdom, vdom);
    this._vdom = vdom; // 替换
  }
  /**
   * 由于不再去重新渲染而是更新，所以rerender函数不再需要了，那么这里面vdom的创建和比对的逻辑都会在Component基类里面去实现
    // 重新绘制的算法：简单的指令不需要任何参数发给class就会进行重新绘制
    // rerender() {
    // 把原来range里面的这些东西全删掉
    // this._range.deleteContents();
    // this[RENDER_TO_DOM](this._range);
    // 首先对它做了deleteContents然后产生了一个全空的range，
    // 而全空的range如果有相邻的range就会被吞进下一个range里面，
    // 然后我们再插入的时候它就会被后边的range包含进去，
    // 我们在rerender的时候是需要保证这个range是不空的，
    // 所以先插入再去删除

    // 保存老的range
    let oldRange = this._range;
    //先创建一个插入的range，插到内容之前，这样老的range就不会空
    let range = document.createRange();
    // 由于插入的点是没有范围的，所以是startContainer、startOffset，起点终点是一样的
    range.setStart(oldRange.startContainer, oldRange.startOffset);
    range.setEnd(oldRange.startContainer, oldRange.startOffset);
    // 完成插入
    this[RENDER_TO_DOM](range);

    // 注意：我们创建新的插入点range的时候，因为是一个没有宽度的range，所以它其实也在老的range之内，所以插入老的range的时候范围也增大了
    // 那么在我们deleteContents之前，要给老的range的Start的节点重设，插入到内容之后
    oldRange.setStart(range.endContainer, range.endOffset);
    // 再把它所有内容删除
    oldRange.deleteContents();
  }
  */
  // 会假设已经有了一个state方法，做一个深拷贝的合并
  setState(newState) {
    if (this.state === null || typeof this.state !== 'object') {
      // 替换
      this.state = newState;
      this.rerender();
      return;
    }
    // 假设已经有了state方法，但有可能是null，需要写一个递归的形式去访问它的每一个对象和属性
    let merge = (oldState, newState) => {
      // for所有的子节点, 假设oldState、newState都是object
      for (let p in newState) {
        if (oldState[p] === null || typeof oldState[p] !== 'object') {
          oldState[p] = newState[p];
        } else {
          merge(oldState[p], newState[p]);
        }
      }
    }
    merge(this.state, newState);
    this.update();
  }
  // 在这个结构里面, root就是跟渲染相关的东西
  // get root() {
  //   if (!this._root) {
  //     // 取root的过程：如果它是render回来的结构，是一个Component的子类就会对root进行一个递归的调用；反之如果不是最后会变成ElementWrapper/TextWrapper；都是真正有root的情况下
  //     this._root = this.render().root;
  //   }
  //   return this._root;
  // }
}

// 封装 createElement()
class ElementWrepper extends Component {
  // 简单的策略：创建的实体DOM放到属性上
  constructor(type) {
    super(type);
    // this.root = document.createElement(type); // 实现实体dom就不需要这个了
    this.type = type;
  }
  // 注释之后在main.js打印vdom的时候会有children数据
  /**
  // 存this.props
  setAttribute(name, value) {
    // 事件绑定函数以on开头的做判断处理
    if (name.match(/^on([\s\S]+)$/)) {
      // 事件匹配驼峰命名，确保了以小写字母开头的
      this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
    } else {
      // 由于css没有生效，这时候需要将classname处理成class
      if (name === 'className') {
        this.root.setAttribute('class', value);
      } else {
        this.root.setAttribute(name, value);
      }
    }
  }
  // 存this.children
  appendChild(component) {
    // this.root.appendChild(component.root);
    let range = document.createRange();
    range.setStart(this.root, this.root.childNodes.length);
    range.setEnd(this.root, this.root.childNodes.length);
    component[RENDER_TO_DOM](range)
  }
  */
  // 获取一个虚拟dom：返回一个新对象是为了让vdom树比较干净而操作的，如果这个对象上没有方法就没有办法完成重绘 
  get vdom() {
    // 保证任何一个vdom属性的这个树里面取出来的children都有vchildren这属性，递归调用
    this.vchildren = this.children.map(child => child.vdom);
    return this;
    // return {
    //   type: this.type,
    //   props: this.props,
    //   children: this.children.map(child => child.vdom) // 组件的children变成vdom的children
    // }
  }
  // 整个虚拟dom到实体dom的更新
  [RENDER_TO_DOM](range) {
    this._range = range;
    // 1.内容删除
    // range.deleteContents();
    // 访问对象上有效的虚拟dom的所有属性: root props、children
    let root = document.createElement(this.type);
    // 处理props{}
    for (let name in this.props) {
      let value = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
      } else {
        if (name === 'className') {
          root.setAttribute('class', value);
        } else {
          root.setAttribute(name, value);
        }
      }
    }
    // 确保vchildren真正存在
    if (this.vchildren) {
      this.vchildren = this.children.map(child => child.vdom);
    }
    // 处理children[]：用vchildren渲染才算是一棵真正虚拟dom树操作
    for (let child of this.vchildren) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](childRange);
    }
    replaceContent(range, root);

    // 2.插入节点
    // range.insertNode(root);
  }
}
// 封装 createTextNode()
class TextWrepper extends Component {
  constructor(content) {
    super(content);
    // this.root = document.createTextNode(content);
    this.content = content;
    this.type = '#text';
  }
  get vdom() {
    return this;
    // return {
    //   type: '#text',
    //   content: this.content
    // }
  }
  // get vchildren() {
  //   return this.children.map(child => child.vdom);
  // }
  [RENDER_TO_DOM](range) {
    this._range = range;
    // range.deleteContents();
    // range.insertNode(this.root);
    let root = document.createTextNode(this.content);
    replaceContent(range, root);
  }
}

// 先插入后删除
function replaceContent(range, node) {
  // 出现在最前
  range.insertNode(node);
  // 挪到之后
  range.setStartAfter(node);
  // 内容删除
  range.deleteContents();
  // 设回range
  range.setStartBefore(node); 
  range.setEndAfter(node);
}

/**
 * @param {String} type 类型
 * @param {Array} attributes 属性列表
 * @param {Array} children 子节点
 * @description 封装createElement、createTextNode与MyComponent组件一致
 */
export function createElement(type, attributes, ...children) {
  // 当成一个普通的element处理
  let e;
  // 由于MyComponent被当成对象所以需要处理一下
  if (typeof type === 'string') {
    // 当type被自定义成class的时候，我们无论如何也没办法让他能够变成一个真正的dom对象，所以需要对document.createElement(type)进行封装
    e = new ElementWrepper(type);
  } else {
    e = new type;
  }
  // 不管子节点有几层，都会把它翻译成createElement的函数调用
  console.log(type, attributes, children);
  // let e = document.createElement(type);
  for (let p in attributes) {
    e.setAttribute(p, attributes[p]);
  }
  let insterChildren = children => {
    for (let child of children) {
      if (typeof child === 'string') {
        child = new TextWrepper(child);
      }
      if (child === null) {
        continue;
      }
      if (typeof child === 'object' && (child instanceof Array)) {
        insterChildren(child);
      } else {
        e.appendChild(child);
      }
    }
  }
  insterChildren(children);
  return e;
}
// 组件更新的源头：render环节
export function render(component, praentElement) {
  // 取root的过程：真实的渲染过程
  // praentElement.appendChild(component.root);
  // 在praentElement的尾巴上加上range：如果render认为要把整个Element的praentElement里面的内容给它替换掉，那么就应该把praentElement给清空
  let range = document.createRange();
  // range是由一个Start节点和一个End的节点组成的：praentElement, offset
  range.setStart(praentElement, 0); // 选0是从Element第一个children到最后一个children
  range.setEnd(praentElement, praentElement.childNodes.length) // 选他的childNodes的长度
  range.deleteContents();
  component[RENDER_TO_DOM](range)
}