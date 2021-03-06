/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const React = require('react')
const ReactDOM = require('react-dom')

const ImmutableComponent = require('./immutableComponent')

const windowActions = require('../actions/windowActions')
const windowStore = require('../stores/windowStore')
const dragTypes = require('../constants/dragTypes')
const cx = require('../lib/classSet')

const Button = require('./button')
const Tab = require('./tab')
const dnd = require('../dnd')
const dndData = require('../dndData')

class Tabs extends ImmutableComponent {
  constructor () {
    super()
    this.onDragOver = this.onDragOver.bind(this)
    this.onDrop = this.onDrop.bind(this)
    this.onPrevPage = this.onPrevPage.bind(this)
    this.onNextPage = this.onNextPage.bind(this)
  }

  onPrevPage () {
    if (this.props.tabPageIndex === 0) {
      return
    }
    windowActions.setTabPageIndex(this.props.tabPageIndex - 1)
  }

  onNextPage () {
    if (this.props.tabPageIndex + 1 === this.totalPages) {
      return
    }
    windowActions.setTabPageIndex(this.props.tabPageIndex + 1)
  }

  get totalPages () {
    return Math.ceil(this.props.tabs.size / this.props.tabsPerTabPage)
  }

  onDrop (e) {
    const clientX = e.clientX
    const sourceDragData = dndData.getDragData(e.dataTransfer, dragTypes.TAB)
    if (sourceDragData) {
      // This must be executed async because the state change that this causes
      // will cause the onDragEnd to never run
      setTimeout(() => {
        const key = sourceDragData.get('key')
        let droppedOnTab = dnd.closestFromXOffset(this.tabRefs.filter((node) => node && node.props.tab.get('frameKey') !== key), clientX).selectedRef
        if (droppedOnTab) {
          const isLeftSide = dnd.isLeftSide(ReactDOM.findDOMNode(droppedOnTab), clientX)
          const droppedOnFrameProps = windowStore.getFrame(droppedOnTab.props.tab.get('frameKey'))
          windowActions.moveTab(sourceDragData, droppedOnFrameProps, isLeftSide)
          if (sourceDragData.get('pinnedLocation')) {
            windowActions.setPinned(sourceDragData, false)
          }
        }
      }, 0)
      return
    }
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach((file) =>
        windowActions.newFrame({location: file.path, title: file.name}))
    }
  }

  onDragOver (e) {
    if (dndData.hasDragData(e.dataTransfer, dragTypes.TAB)) {
      e.dataTransfer.dropEffect = 'move'
      e.preventDefault()
      return
    }
    let intersection = e.dataTransfer.types.filter((x) => ['Files'].includes(x))
    if (intersection.length > 0) {
      e.dataTransfer.dropEffect = 'copy'
      e.preventDefault()
    }
  }

  newTab () {
    windowActions.newFrame()
  }

  render () {
    this.tabRefs = []
    return <div className='tabs'>
      <span className={cx({
        tabStripContainer: true,
        allowDragging: this.props.shouldAllowWindowDrag
      })}
        onDragOver={this.onDragOver}
        onDrop={this.onDrop}>
        {(() => {
          if (this.props.tabPageIndex > 0) {
            return <span
              className='prevTab fa fa-caret-left'
              onClick={this.onPrevPage} />
          }
        })()}
        {
          this.props.currentTabs
            .map((tab) =>
              <Tab ref={(node) => this.tabRefs.push(node)}
                draggingOverData={this.props.draggingOverData}
                tab={tab}
                key={'tab-' + tab.get('frameKey')}
                paintTabs={this.props.paintTabs}
                previewTabs={this.props.previewTabs}
                isActive={this.props.activeFrameKey === tab.get('frameKey')}
                partOfFullPageSet={this.props.partOfFullPageSet} />)
        }
        {(() => {
          if (this.props.currentTabs.size >= this.props.tabsPerTabPage && this.totalPages > this.props.tabPageIndex + 1) {
            return <span
              className='nextTab fa fa-caret-right'
              onClick={this.onNextPage} />
          }
        })()}
        <Button label='+'
          l10nId='newTabButton'
          className='navbutton newFrameButton'
          onClick={this.newTab} />
      </span>
    </div>
  }
}

module.exports = Tabs
