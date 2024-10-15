import FabricTool, { ConfigureCanvasProps } from "./fabrictool"
import { PencilBrush } from "fabric"

class FreedrawTool extends FabricTool {
  configureCanvas({
    strokeWidth,
    strokeColor,
  }: ConfigureCanvasProps): () => void {
    this._canvas.isDrawingMode = true
    this._canvas.freeDrawingBrush = new PencilBrush(this._canvas)
    // if (this._canvas.freeDrawingBrush) {
    //   // console.log("Free drawing brush exists");
    this._canvas.freeDrawingBrush.width = strokeWidth
    this._canvas.freeDrawingBrush.color = strokeColor

    // TODO: add handler to convert from bezier path to line coords
    // this._canvas.on("path:created", (e: any) => {
    //     // console.log("Path created");
    //     // console.log(e);
    //     // console.log(this._canvas.toJSON());
    //     // this.saveState(this._canvas.toJSON())
    // })

    return () => {}
  }
}

export default FreedrawTool
