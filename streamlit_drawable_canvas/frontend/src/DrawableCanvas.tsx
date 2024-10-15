import React, { useEffect, useState } from "react"
import {
  ComponentProps,
  Streamlit,
  withStreamlitConnection,
} from "streamlit-component-lib"
import { Canvas, Rect, StaticCanvas } from 'fabric'
import { isEqual } from "lodash"

import CanvasToolbar from "./components/CanvasToolbar"
import UpdateStreamlit from "./components/UpdateStreamlit"

import { useCanvasState } from "./DrawableCanvasState"
import { tools, FabricTool } from "./lib"

function getStreamlitBaseUrl(): URL | null {
  const params = new URLSearchParams(window.location.search)
  const baseUrl = params.get("streamlitUrl")
  if (baseUrl == null) {
    return null
  }

  try {
    return new URL(baseUrl)
  } catch {
    return null
  }
}

/**
 * Arguments Streamlit receives from the Python side
 */
export interface PythonArgs {
  fillColor: string
  strokeWidth: number
  strokeColor: string
  backgroundColor: string
  backgroundImageURL: string
  realtimeUpdateStreamlit: boolean
  canvasWidth: number
  canvasHeight: number
  drawingMode: string
  initialDrawing: Object
  displayToolbar: boolean
  displayRadius: number
}

/**
 * Define logic for the canvas area
 */
const DrawableCanvas = ({ args }: ComponentProps) => {
  const {
    canvasWidth,
    canvasHeight,
    backgroundColor,
    backgroundImageURL,
    realtimeUpdateStreamlit,
    drawingMode,
    fillColor,
    strokeWidth,
    strokeColor,
    displayRadius,
    initialDrawing,
    displayToolbar,
  }: PythonArgs = args

  /**
   * State initialization
   */
  // console.log(args);
  const [canvas, setCanvas] = useState(new Canvas(""))
  canvas.stopContextMenu = true
  canvas.fireRightClick = true

  const [backgroundCanvas, setBackgroundCanvas] = useState(
    new StaticCanvas("")
  )
  const {
    canvasState: {
      action: { shouldReloadCanvas, forceSendToStreamlit },
      currentState,
      initialState,
    },
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    forceStreamlitUpdate,
    resetState,
  } = useCanvasState()

  /**
   * Initialize canvases on component mount
   * NB: Remount component by changing its key instead of defining deps
   */
  useEffect(() => {
    const c = new Canvas("canvas", {
      enableRetinaScaling: false,
    })
    const imgC = new StaticCanvas("backgroundimage-canvas", {
      enableRetinaScaling: false,
    })
    setCanvas(c)
    setBackgroundCanvas(imgC)
    Streamlit.setFrameHeight()
  }, [])

  /**
   * Load user drawing into canvas
   * Python-side is in charge of initializing drawing with background color if none provided
   */
  useEffect(() => {
    // console.log("Resetting state with initial drawing");
    if (!isEqual(initialState, initialDrawing)) {
      canvas.loadFromJSON(initialDrawing, () => {
        resetState(initialDrawing)
      })
      .then(() => {
        canvas.renderAll() // TODO: check if must rerender before resetting state
      })
    }
  }, [canvas, initialDrawing, initialState, resetState])

  /**
   * Update background image
   */
  useEffect(() => {
    if (backgroundImageURL) {
      var bgImage = new Image();
      bgImage.onload = function() {
        backgroundCanvas.getContext().drawImage(bgImage, 0, 0);
      };
      var retryCount = 0;
      const maxRetries = 5;

      const baseUrl = getStreamlitBaseUrl();
      let urlOrigin = baseUrl?.origin ?? "";
      
      if (baseUrl?.origin?.includes("streamlit")) {
        urlOrigin += "/~/+"; // proper full link for streamlit media
      }

      bgImage.onerror = function() {
        if (retryCount < maxRetries) {
            retryCount++;
            // console.log("Retry loading image, attempt: " + retryCount);
            setTimeout(() => {
                // Update the src to trigger a reload
                bgImage.src = urlOrigin + backgroundImageURL + "?retry=" + retryCount;
            }, retryCount * 1000); // Wait 1 second for the first retry, 2 seconds for the second
        } else {
            console.error("Failed to load the image after " + maxRetries + " retries.");
        }
      };

      // console.log(`image loaded after ${retryCount + 1} tries`);

      bgImage.src = urlOrigin + backgroundImageURL
      // console.log(baseUrl);
      // console.log(backgroundImageURL);
      // console.log(bgImage.src);
      // console.log();
    }
  }, [
    canvas,
    backgroundCanvas,
    canvasHeight,
    canvasWidth,
    backgroundColor,
    backgroundImageURL,
    saveState,
  ])

  /**
   * If state changed from undo/redo/reset, update user-facing canvas
   */
  useEffect(() => {
    if (shouldReloadCanvas) {
      canvas.loadFromJSON(currentState, () => {}).then(() => {
        canvas.renderAll()
      })
    }
  }, [canvas, shouldReloadCanvas, currentState])

  /**
   * Update canvas with selected tool
   * PS: add initialDrawing in dependency so user drawing update reinits tool
   */
  useEffect(() => {
    // Update canvas events with selected tool
    const selectedTool = new tools[drawingMode](canvas) as FabricTool
    const cleanupToolEvents = selectedTool.configureCanvas({
      fillColor: fillColor,
      strokeWidth: strokeWidth,
      strokeColor: strokeColor,
      displayRadius: displayRadius
    })

    console.log(`Selected fillColor: ${fillColor}`);
    console.log(`Selected strokeColor: ${strokeColor}`);

    const handleMouseUp = (e: any) => {
      console.log("Mouse up");
      console.log(canvas.toJSON());
      saveState(canvas.toJSON())
      if (e.button === 3) {
        forceStreamlitUpdate()
      }
    }
    console.log("Canvas toJSON:");
    console.log(canvas.toJSON());

    // Event: double click (handle double clicks)
    const handleMouseDblClick = () => {
      console.log("Double click");
      console.log(canvas.toJSON());
      saveState(canvas.toJSON())
    }

    canvas.on("mouse:up", handleMouseUp)
    canvas.on("mouse:dblclick", handleMouseDblClick)

    // Clean up event listeners when the tool changes or component unmounts
    return () => {
      cleanupToolEvents()
      canvas.off("mouse:up", handleMouseUp)
      canvas.off("mouse:dblclick", handleMouseDblClick)
    }

  }, [
    canvas,
    strokeWidth,
    strokeColor,
    displayRadius,
    fillColor,
    drawingMode,
    initialDrawing,
    saveState,
    forceStreamlitUpdate,
  ])

  /**
   * Render canvas w/ toolbar
   */
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: -10,
          visibility: "hidden",
        }}
      >
        <UpdateStreamlit
          canvasHeight={canvasHeight}
          canvasWidth={canvasWidth}
          shouldSendToStreamlit={
            realtimeUpdateStreamlit || forceSendToStreamlit
          }
          stateToSendToStreamlit={currentState}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 0,
        }}
      >
        <canvas
          id="backgroundimage-canvas"
          width={canvasWidth}
          height={canvasHeight}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 10,
        }}
      >
        <canvas
          id="canvas"
          width={canvasWidth}
          height={canvasHeight}
          style={{ border: "lightgrey 1px solid" }}
        />
      </div>
      {displayToolbar && (
        <CanvasToolbar
          topPosition={canvasHeight}
          leftPosition={canvasWidth}
          canUndo={canUndo}
          canRedo={canRedo}
          downloadCallback={forceStreamlitUpdate}
          undoCallback={undo}
          redoCallback={redo}
          resetCallback={() => {
            resetState(initialState)
          }}
        />
      )}
    </div>
  )
}

export default withStreamlitConnection(DrawableCanvas)
