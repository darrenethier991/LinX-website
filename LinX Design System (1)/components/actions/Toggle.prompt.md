**Toggle** — a pill switch with a gold thumb, for binary choices like Monthly/Annual billing.

```jsx
const [annual, setAnnual] = useState(false);
<Toggle checked={annual} onChange={setAnnual} />
```

Controlled: pass `checked` and handle `onChange(next)`. Pair with two text labels on either side.
