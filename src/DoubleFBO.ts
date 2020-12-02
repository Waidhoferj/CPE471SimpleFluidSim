import * as twgl from "twgl.js";

export default class DoubleFBO {
  width: number;
  height: number;
  readBuffer: twgl.FramebufferInfo;
  writeBuffer: twgl.FramebufferInfo;

  constructor(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    attachments: twgl.AttachmentOptions[] = undefined
  ) {
    this.width = width;
    this.height = height;
    this.readBuffer = twgl.createFramebufferInfo(
      gl,
      attachments,
      width,
      height
    );
    this.writeBuffer = twgl.createFramebufferInfo(
      gl,
      attachments,
      width,
      height
    );
  }

  swap() {
    let temp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = temp;
  }

  resize(gl: WebGL2RenderingContext, width: number, height: number) {
    this.width = width;
    this.height = height;
    twgl.resizeFramebufferInfo(
      gl,
      this.readBuffer,
      this.readBuffer.attachments,
      width,
      height
    );
    twgl.resizeFramebufferInfo(
      gl,
      this.writeBuffer,
      this.writeBuffer.attachments,
      width,
      height
    );
  }
}
