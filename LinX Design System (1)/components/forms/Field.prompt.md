**Field** — a labelled text input or textarea. Uppercase caption label; gold border on focus.

```jsx
<Field label="Your Name" value={name} onChange={e => setName(e.target.value)} />
<Field label="Describe Your Project" multiline />
```

Set `multiline` for a textarea; `type` for email/tel/etc.
