import React, { useEffect, useState } from "react"
import { Streamlit } from "streamlit-component-lib"
import { Canvas } from "fabric"

const DELAY_DEBOUNCE = 200

/**
 * Download image and JSON data from canvas to send back to Streamlit
 */
const sendDataToStreamlit = (canvas: Canvas): void => {
  const data = canvas
    .getContext()
    .canvas.toDataURL()
  Streamlit.setComponentValue({
    data: data,
    width: canvas.getWidth(),
    height: canvas.getHeight(),
    raw: canvas.toObject(),
  })
  // console.log("actual canvas:");
  // console.log(canvas);
  // console.log("canvas data:");
  // console.log(data);
  // console.log("canvas object:");
  // console.log(canvas.toObject());
  // console.log("canvas object w/ explicit prop objects:");
  // console.log(canvas.toObject(['objects']));
  // console.log("canvas json:");
  // console.log(canvas.toJSON());
}

/**
 * This hook allows you to debounce any fast changing value.
 * The debounced value will only reflect the latest value when the useDebounce hook has not been called for the specified time period.
 * When used in conjunction with useEffect, you can easily ensure that expensive operations like API calls are not executed too frequently.
 * https://usehooks.com/useDebounce/
 * @param value value to debounce
 * @param delay delay of debounce in ms
 */
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value)
      }, delay)

      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler)
      }
    },
    [value, delay] // Only re-call effect if value or delay changes
  )
  return debouncedValue
}

interface UpdateStreamlitProps {
  shouldSendToStreamlit: boolean
  stateToSendToStreamlit: Object
  canvasWidth: number
  canvasHeight: number
}

/**
 * Canvas whose sole purpose is to draw current state
 * to send image data to Streamlit.
 * Put it in the background or make it invisible!
 */
const UpdateStreamlit = (props: UpdateStreamlitProps) => {
  const [stCanvas, setStCanvas] = useState(new Canvas(""))

  // Debounce fast changing canvas states
  // Especially when drawing lines and circles which continuously render while drawing
  const debouncedStateToSend = useDebounce(
    props.stateToSendToStreamlit,
    DELAY_DEBOUNCE
  )

  // Initialize canvas
  useEffect(() => {
    const stC = new Canvas("canvas-to-streamlit", {
      enableRetinaScaling: false,
    })
    setStCanvas(stC)
  }, [])

  // Load state to canvas, then send content to Streamlit
  useEffect(() => {
    if (debouncedStateToSend && props.shouldSendToStreamlit) {
      // console.log("debounced state updatestreamlit:")
      // console.log(debouncedStateToSend);
      stCanvas.loadFromJSON(debouncedStateToSend, () => {}).then(() => {
        // // console.log(`before: %o`, stCanvas);
        sendDataToStreamlit(stCanvas);
        stCanvas.renderAll();
      })
      // }).then(() => {
      //   // // console.log(`after: %o`, stCanvas);
      // })
      // .then(() => {
      //   stCanvas.renderAll();
      // })
    }}, [stCanvas, props.shouldSendToStreamlit, debouncedStateToSend])

  return (
    <canvas
      id="canvas-to-streamlit"
      width={props.canvasWidth}
      height={props.canvasHeight}
    />
  )
}

export default UpdateStreamlit
