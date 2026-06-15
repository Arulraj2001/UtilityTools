import ReactQuill from 'react-quill'

// Patch to avoid deprecated ReactDOM.findDOMNode usage in react-quill
// If the package calls `findDOMNode` internally, prefer returning the
// stored editing area directly when it's already a DOM node.
try {
  if (ReactQuill && ReactQuill.prototype && typeof ReactQuill.prototype.getEditingArea === 'function') {
    const originalGetEditingArea = ReactQuill.prototype.getEditingArea
    ReactQuill.prototype.getEditingArea = function () {
      // If editingArea is a DOM node, return it directly to avoid findDOMNode
      if (this.editingArea && (this.editingArea.nodeType === 1 || this.editingArea.nodeType === 3)) {
        return this.editingArea
      }
      return originalGetEditingArea.call(this)
    }
  }
} catch (err) {
  // Fail silently — patch is best-effort.
  // eslint-disable-next-line no-console
  console.warn('reactQuillShim patch failed', err)
}

export default ReactQuill
