import { Editor } from "./editor/Editor";

export default function App() {
  return (
    <div className="app">
      {/* The window has no native chrome, so this strip is the only way to
          move it. It becomes the tab strip once tabs land. */}
      <div className="drag-strip" />
      <Editor />
    </div>
  );
}
