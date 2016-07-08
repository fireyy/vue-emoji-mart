import '../vendor/raf-polyfill'

import React from 'react'
import ReactDOM from 'react-dom'
import data from '../../data'

import {store, frequently} from '../utils'
import {Anchors, Category, Preview, Search} from '.'

const RECENT_CATEGORY = { name: 'Recent', emojis: null }
const SEARCH_CATEGORY = { name: 'Search', emojis: null, anchor: RECENT_CATEGORY }

const CATEGORIES = [
  SEARCH_CATEGORY,
  RECENT_CATEGORY,
].concat(data.categories)

export default class Picker extends React.Component {
  constructor(props) {
    super(props)
    this.testStickyPosition()

    this.state = {
      skin: store.get('skin') || props.skin,
    }
  }

  componentWillReceiveProps(props) {
    if (props.skin && !store.get('skin')) {
      this.setState({ skin: props.skin })
    }
  }

  componentDidUpdate() {
    this.updateCategoriesSize()
    this.handleScroll()
  }

  testStickyPosition() {
    var stickyTestElement = document.createElement('div')
    for (let prefix of ['', '-webkit-', '-ms-', '-moz-', '-o-']) {
      stickyTestElement.style.position = `${prefix}sticky`
    }

    this.hasStickyPosition = !!stickyTestElement.style.position.length
  }

  handleEmojiOver(emoji) {
    var { preview } = this.refs
    preview.setState({ emoji: emoji })
    clearTimeout(this.leaveTimeout)
  }

  handleEmojiLeave(emoji) {
    this.leaveTimeout = setTimeout(() => {
      var { preview } = this.refs
      preview.setState({ emoji: null })
    }, 16)
  }

  handleEmojiClick(emoji) {
    this.props.onClick(emoji)
    frequently.add(emoji)

    var component = this.refs['category-1']
    if (component) {
      let maxMargin = component.maxMargin
      component.forceUpdate()

      window.requestAnimationFrame(() => {
        component.memoizeSize()
        if (maxMargin == component.maxMargin) return

        this.updateCategoriesSize()
        this.handleScrollPaint()
      })
    }
  }

  handleScroll() {
    if (!this.waitingForPaint) {
      this.waitingForPaint = true
      window.requestAnimationFrame(this.handleScrollPaint.bind(this))
    }
  }

  handleScrollPaint() {
    this.waitingForPaint = false

    var target = this.refs.scroll,
        scrollTop = target.scrollTop,
        scrollingDown = scrollTop > (this.scrollTop || 0),
        activeCategory = null

    for (let i = 0, l = CATEGORIES.length; i < l; i++) {
      let ii = scrollingDown ? (CATEGORIES.length - 1 - i) : i,
          category = CATEGORIES[ii],
          component = this.refs[`category-${ii}`]

      if (component) {
        let active = component.handleScroll(scrollTop)
        if (active && !activeCategory) {
          if (category.anchor) category = category.anchor
          activeCategory = category
        }
      }
    }

    if (activeCategory) {
      let { anchors } = this.refs,
          { name: categoryName } = activeCategory

      if (anchors.state.selected != categoryName) {
        anchors.setState({ selected: categoryName })
      }
    }

    this.scrollTop = scrollTop
  }

  handleSearch(emojis) {
    SEARCH_CATEGORY.emojis = emojis

    for (let i = 0, l = CATEGORIES.length; i < l; i++) {
      let component = this.refs[`category-${i}`]

      if (component && component.props.name != 'Search') {
        let DOMNode = ReactDOM.findDOMNode(component),
            display = emojis ? 'none' : null

        if (DOMNode) DOMNode.style.display = display
      }
    }

    this.forceUpdate()
  }

  handleAnchorClick(category, i) {
    var component = this.refs[`category-${i}`],
        { scroll, anchors } = this.refs

    if (component) {
      let { top } = component

      if (category.name == 'Recent') {
        top = 0
      } else {
        top += 1
      }

      scroll.scrollTop = top
    }
  }

  handleSkinChange(skin) {
    var newState = { skin: skin }

    this.setState(newState)
    store.update(newState)
  }

  updateCategoriesSize() {
    for (let i = 0, l = CATEGORIES.length; i < l; i++) {
      let component = this.refs[`category-${i}`]
      if (component) component.memoizeSize()
    }
  }

  render() {
    var { perLine, emojiSize, sheetURL } = this.props,
        { skin } = this.state,
        width = (perLine * (emojiSize + 12)) + 12 + 2

    return <div style={{width: width}} className='emoji-picker'>
      <div className='emoji-picker-bar'>
        <Anchors
          ref='anchors'
          categories={CATEGORIES}
          onAnchorClick={this.handleAnchorClick.bind(this)}
        />
      </div>

      <div ref="scroll" className='emoji-picker-scroll' onScroll={this.handleScroll.bind(this)}>
        <Search
          onSearch={this.handleSearch.bind(this)}
        />

        {CATEGORIES.map((category, i) => {
          return <Category
            ref={`category-${i}`}
            key={category.name}
            name={category.name}
            emojis={category.emojis}
            perLine={perLine}
            hasStickyPosition={this.hasStickyPosition}
            emojiProps={{
              skin: skin,
              size: emojiSize,
              sheetURL: sheetURL,
              onOver: this.handleEmojiOver.bind(this),
              onLeave: this.handleEmojiLeave.bind(this),
              onClick: this.handleEmojiClick.bind(this),
            }}
          />
        })}
      </div>

      <div className='emoji-picker-bar'>
        <Preview
          ref='preview'
          emojiProps={{
            size: 38,
            sheetURL: sheetURL,
          }}
          skinsProps={{
            skin: skin,
            onChange: this.handleSkinChange.bind(this)
          }}
        />
      </div>
    </div>
  }
}

Picker.propTypes = {
  onClick: React.PropTypes.func,
  skin: React.PropTypes.number,
  perLine: React.PropTypes.number,
  emojiSize: React.PropTypes.number,
  sheetURL: React.PropTypes.string.isRequired,
}

Picker.defaultProps = {
  onClick: (() => {}),
  emojiSize: 24,
  perLine: 9,
  skin: 1,
}
