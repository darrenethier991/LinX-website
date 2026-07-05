**Segmented** — a pill control for 2–3 exclusive options; the active one fills gold.

```jsx
const [role, setRole] = useState("homeowner");
<Segmented value={role} onChange={setRole}
  options={[{label:"🏡 Homeowner", value:"homeowner"}, {label:"🔨 Contractor", value:"contractor"}]} />
```
