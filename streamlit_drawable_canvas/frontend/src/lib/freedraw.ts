import FabricTool, { ConfigureCanvasProps } from "./fabrictool"

class FreedrawTool extends FabricTool {
  configureCanvas({
    strokeWidth,
    strokeColor,
  }: ConfigureCanvasProps): () => void {
    this._canvas.isDrawingMode = true
    if (this._canvas.freeDrawingBrush) {
      this._canvas.freeDrawingBrush.width = strokeWidth
      this._canvas.freeDrawingBrush.color = strokeColor
    }
    return () => {}
  }
}

export default FreedrawTool
