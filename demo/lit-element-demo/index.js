import { customElement, html, LitElement, property } from "lit-element";
import fa from "font-awesome/css/font-awesome.css";

@customElement("test-component")
class TestComponent extends LitElement {
  @property()
  heading = "test";

  render() {
    return html`
      <link rel="stylesheet" href="${fa}" />
      <h2>${this.heading}</h2>
      Test <i class="fa fa-address-book"></i>
    `;
  }
}

export default TestComponent;
document.getElementById("lit-element-demo").innerHTML = `
<test-component heading="Hello world"></test-component>
`;
