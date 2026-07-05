/* @ds-bundle: {"format":3,"namespace":"LinXDesignSystem_1b8a1a","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"Toggle","sourcePath":"components/actions/Toggle.jsx"},{"name":"AdminBadge","sourcePath":"components/admin/AdminBadge.jsx"},{"name":"AdminStatCard","sourcePath":"components/admin/AdminStatCard.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"SectionLabel","sourcePath":"components/display/SectionLabel.jsx"},{"name":"StatItem","sourcePath":"components/display/StatItem.jsx"},{"name":"FaqItem","sourcePath":"components/feedback/FaqItem.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Segmented","sourcePath":"components/forms/Segmented.jsx"},{"name":"LiveCard","sourcePath":"components/marketplace/LiveCard.jsx"},{"name":"StepItem","sourcePath":"components/marketplace/StepItem.jsx"},{"name":"Testimonial","sourcePath":"components/marketplace/Testimonial.jsx"},{"name":"Navbar","sourcePath":"components/navigation/Navbar.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"},{"name":"FeatureCard","sourcePath":"components/surfaces/FeatureCard.jsx"},{"name":"PricingCard","sourcePath":"components/surfaces/PricingCard.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"fce1efd82a75","components/actions/Toggle.jsx":"6a0f7a8cd9ac","components/admin/AdminBadge.jsx":"5a49a26cbd6b","components/admin/AdminStatCard.jsx":"7856d8ec9360","components/display/Badge.jsx":"5300f264409b","components/display/SectionLabel.jsx":"4448b55881a2","components/display/StatItem.jsx":"8b03185626e7","components/feedback/FaqItem.jsx":"6b7d6f256830","components/feedback/Toast.jsx":"85f1362040e2","components/forms/Field.jsx":"3d91b4656a21","components/forms/Segmented.jsx":"0ab31391cc87","components/marketplace/LiveCard.jsx":"b58d7728ff66","components/marketplace/StepItem.jsx":"54e2c29950cd","components/marketplace/Testimonial.jsx":"3cda3a42415a","components/navigation/Navbar.jsx":"12aee75c7cb2","components/surfaces/Card.jsx":"c5987e457ea3","components/surfaces/FeatureCard.jsx":"cb10dd7e49b4","components/surfaces/PricingCard.jsx":"3b7002c52ef2","ui_kits/admin/admin-app.jsx":"af1a46337986","ui_kits/marketing/marketing-app.jsx":"667496ce32d6"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LinXDesignSystem_1b8a1a = window.LinXDesignSystem_1b8a1a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * LinX Button — a pill-shaped, UPPERCASE, letter-spaced call to action.
 * The brand's signature interaction: gold fills or gold outlines that
 * invert to solid gold on hover.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  disabled = false,
  block = false,
  type = "button",
  style = {},
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const sizes = {
    sm: {
      padding: "7px 16px",
      fontSize: "11px"
    },
    md: {
      padding: "9px 22px",
      fontSize: "12px"
    },
    lg: {
      padding: "12px 28px",
      fontSize: "13px"
    }
  };
  const base = {
    display: block ? "flex" : "inline-flex",
    width: block ? "100%" : "auto",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    borderRadius: "var(--radius-pill)",
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    letterSpacing: "var(--ls-wide)",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    textDecoration: "none",
    transition: "all var(--dur-fast) ease",
    boxSizing: "border-box",
    ...sizes[size]
  };
  const variants = {
    // Solid gold
    primary: {
      background: hover ? "var(--linx-gold-light)" : "var(--linx-gold)",
      color: "var(--text-on-gold)",
      border: "1px solid transparent"
    },
    // Black with gold outline → fills gold on hover
    "outline-gold": {
      background: hover ? "var(--linx-gold)" : "#000",
      color: hover ? "#000" : "var(--linx-gold)",
      border: "1px solid var(--linx-gold-85)"
    },
    // Neutral outline → gold text/border on hover
    outline: {
      background: "#000",
      color: hover ? "var(--linx-gold)" : "var(--text-primary)",
      border: `1px solid ${hover ? "var(--linx-gold-55)" : "var(--border-hairline)"}`
    }
  };
  const composed = {
    ...base,
    ...variants[variant],
    ...style
  };
  const Tag = href ? "a" : "button";
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    type: href ? undefined : type,
    onClick: disabled ? undefined : onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: composed,
    disabled: href ? undefined : disabled
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/Toggle.jsx
try { (() => {
/**
 * LinX Toggle — a pill switch used for billing (Monthly/Annual) and
 * role (Homeowner/Contractor) choices. Gold thumb on a dark track.
 */
function Toggle({
  checked = false,
  onChange,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "switch",
    "aria-checked": checked,
    onClick: () => onChange && onChange(!checked),
    style: {
      width: "44px",
      height: "24px",
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "12px",
      position: "relative",
      cursor: "pointer",
      flexShrink: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "18px",
      height: "18px",
      background: "var(--linx-gold)",
      borderRadius: "50%",
      position: "absolute",
      top: "3px",
      left: checked ? "23px" : "3px",
      transition: "left var(--dur-base) ease"
    }
  }));
}
Object.assign(__ds_scope, { Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Toggle.jsx", error: String((e && e.message) || e) }); }

// components/admin/AdminBadge.jsx
try { (() => {
/**
 * LinX AdminBadge — a rounded status pill for the admin theme.
 */
function AdminBadge({
  children,
  tone = "muted",
  style = {}
}) {
  const tones = {
    success: {
      background: "rgba(16,185,129,0.2)",
      color: "#6EE7B7"
    },
    muted: {
      background: "rgba(51,65,85,0.6)",
      color: "#CBD5E1"
    },
    accent: {
      background: "rgba(56,189,248,0.18)",
      color: "var(--admin-accent)"
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 10px",
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-sans)",
      fontSize: "12px",
      fontWeight: 500,
      ...tones[tone],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { AdminBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/admin/AdminBadge.jsx", error: String((e && e.message) || e) }); }

// components/admin/AdminStatCard.jsx
try { (() => {
/**
 * LinX AdminStatCard — a metric tile for the internal admin dashboard
 * (slate + sky theme). Uppercase label, large accented value, delta.
 * Wrap the admin surface in an element with class="linx-admin".
 */
function AdminStatCard({
  label,
  value,
  delta,
  accent = "accent",
  style = {}
}) {
  const accents = {
    accent: "var(--admin-accent)",
    success: "var(--admin-success)",
    danger: "var(--admin-danger)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(15,23,42,0.8)",
      border: "1px solid var(--admin-surface-soft)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-admin)",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      boxSizing: "border-box",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "var(--admin-text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "24px",
      fontWeight: 600,
      color: accents[accent]
    }
  }, value), delta != null && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "12px",
      color: "var(--admin-text-secondary)"
    }
  }, delta >= 0 ? "+" : "", delta, " today")));
}
Object.assign(__ds_scope, { AdminStatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/admin/AdminStatCard.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
/**
 * LinX Badge — a small pill with a tinted background and colored text.
 * Used for live-feed status (LIVE / NEW / HOT) and generic labels.
 */
function Badge({
  children,
  tone = "success",
  style = {}
}) {
  const tones = {
    success: {
      background: "var(--linx-success-12)",
      color: "var(--linx-success)"
    },
    info: {
      background: "var(--linx-info-12)",
      color: "var(--linx-info)"
    },
    error: {
      background: "var(--linx-error-12)",
      color: "var(--linx-error)"
    },
    gold: {
      background: "var(--linx-gold-12)",
      color: "var(--linx-gold)"
    },
    muted: {
      background: "rgba(255,255,255,0.06)",
      color: "var(--text-secondary)"
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      padding: "3px 9px",
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-sans)",
      fontSize: "10px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "var(--ls-wide)",
      ...tones[tone],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/SectionLabel.jsx
try { (() => {
/**
 * LinX SectionLabel — the gold uppercase eyebrow that opens every
 * marketing section (e.g. "Transparent Pricing").
 */
function SectionLabel({
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--fs-eyebrow)",
      fontWeight: 600,
      letterSpacing: "var(--ls-eyebrow)",
      textTransform: "uppercase",
      color: "var(--text-accent)",
      marginBottom: "10px",
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { SectionLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/SectionLabel.jsx", error: String((e && e.message) || e) }); }

// components/display/StatItem.jsx
try { (() => {
/**
 * LinX StatItem — a big gold number over a wide-tracked label.
 * Used in the hero stats bar (e.g. "1,400+ Contractors").
 */
function StatItem({
  value,
  label,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontSize: "24px",
      fontWeight: 800,
      color: "var(--linx-gold)",
      lineHeight: 1
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "11px",
      color: "var(--text-secondary)",
      textTransform: "uppercase",
      letterSpacing: "var(--ls-widest)",
      marginTop: "6px"
    }
  }, label));
}
Object.assign(__ds_scope, { StatItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/StatItem.jsx", error: String((e && e.message) || e) }); }

// components/feedback/FaqItem.jsx
try { (() => {
const {
  useState
} = React;
/**
 * LinX FaqItem — an accordion row. Question on a hairline-divided row;
 * a gold "+" rotates to "×" when open, revealing the answer.
 */
function FaqItem({
  question,
  answer,
  defaultOpen = false,
  style = {}
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hover, setHover] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setOpen(!open),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 0",
      fontFamily: "var(--font-sans)",
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
      userSelect: "none",
      color: hover ? "var(--linx-gold)" : "var(--text-primary)",
      transition: "color var(--dur-base)"
    }
  }, question, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--linx-gold)",
      fontSize: "18px",
      fontWeight: 300,
      lineHeight: 1,
      flexShrink: 0,
      marginLeft: "16px",
      transform: open ? "rotate(45deg)" : "none",
      transition: "transform var(--dur-base)"
    }
  }, "+")), open && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 0 16px",
      fontFamily: "var(--font-sans)",
      fontSize: "13px",
      color: "var(--text-secondary)",
      lineHeight: "var(--lh-relaxed)"
    }
  }, answer));
}
Object.assign(__ds_scope, { FaqItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/FaqItem.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/**
 * LinX Toast — a small bottom-right notification with a gold border.
 * Purely presentational; control visibility from the parent.
 */
function Toast({
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--linx-gold)",
      borderRadius: "var(--radius-sm)",
      padding: "12px 18px",
      fontFamily: "var(--font-sans)",
      fontSize: "13px",
      color: "var(--text-primary)",
      maxWidth: "320px",
      boxShadow: "var(--shadow-card)",
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * LinX Field — a labelled input or textarea. The label is a small
 * uppercase, wide-tracked caption; the control is a dark box that
 * gains a gold border on focus.
 */
function Field({
  label,
  type = "text",
  multiline = false,
  value,
  onChange,
  placeholder,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = useState(false);
  const controlStyle = {
    width: "100%",
    background: "var(--surface-card)",
    border: `1px solid ${focus ? "var(--linx-gold)" : "var(--border-hairline)"}`,
    color: "var(--text-primary)",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "14px",
    fontFamily: "var(--font-sans)",
    outline: "none",
    transition: "border-color var(--dur-base)",
    boxSizing: "border-box",
    resize: multiline ? "vertical" : undefined,
    minHeight: multiline ? "88px" : "40px"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "14px",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      fontFamily: "var(--font-sans)",
      fontSize: "11px",
      fontWeight: 600,
      color: "var(--text-secondary)",
      textTransform: "uppercase",
      letterSpacing: "0.14em",
      marginBottom: "5px"
    }
  }, label), multiline ? /*#__PURE__*/React.createElement("textarea", _extends({
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: controlStyle
  }, rest)) : /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: controlStyle
  }, rest)));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Segmented.jsx
try { (() => {
/**
 * LinX Segmented — a pill-shaped segmented control. The active segment
 * fills gold. Used for role selection (Homeowner / Contractor).
 */
function Segmented({
  options = [],
  value,
  onChange,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-pill)",
      padding: "4px",
      gap: "4px",
      ...style
    }
  }, options.map(opt => {
    const val = typeof opt === "string" ? opt : opt.value;
    const label = typeof opt === "string" ? opt : opt.label;
    const active = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      onClick: () => onChange && onChange(val),
      style: {
        flex: 1,
        padding: "8px",
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-sans)",
        fontSize: "12px",
        fontWeight: 600,
        border: "none",
        background: active ? "var(--linx-gold)" : "transparent",
        color: active ? "var(--text-on-gold)" : "var(--text-secondary)",
        cursor: "pointer",
        transition: "all var(--dur-base)"
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { Segmented });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Segmented.jsx", error: String((e && e.message) || e) }); }

// components/marketplace/LiveCard.jsx
try { (() => {
/**
 * LinX LiveCard — a real-time project row from the live feed: emoji icon,
 * title, location/budget/time meta, and a status badge.
 */
function LiveCard({
  icon,
  title,
  meta,
  badge,
  badgeTone = "success",
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-md)",
      padding: "14px",
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      boxSizing: "border-box",
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "22px",
      lineHeight: 1,
      flexShrink: 0
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "14px",
      fontWeight: 600,
      marginBottom: "2px",
      color: "var(--text-primary)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "12px",
      color: "var(--text-secondary)"
    }
  }, meta)), badge && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: badgeTone
  }, badge)));
}
Object.assign(__ds_scope, { LiveCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/marketplace/LiveCard.jsx", error: String((e && e.message) || e) }); }

// components/marketplace/StepItem.jsx
try { (() => {
/**
 * LinX StepItem — a numbered gold-ringed circle over a title and blurb.
 * Used in "How LinX Works" process rows.
 */
function StepItem({
  number,
  title,
  description,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "48px",
      height: "48px",
      borderRadius: "50%",
      border: "2px solid var(--linx-gold)",
      color: "var(--linx-gold)",
      fontFamily: "var(--font-sans)",
      fontSize: "18px",
      fontWeight: 800,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 14px"
    }
  }, number), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "16px",
      fontWeight: 700,
      marginBottom: "6px",
      color: "var(--text-primary)"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "14px",
      color: "var(--text-secondary)",
      lineHeight: "var(--lh-body)",
      margin: 0
    }
  }, description));
}
Object.assign(__ds_scope, { StepItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/marketplace/StepItem.jsx", error: String((e && e.message) || e) }); }

// components/marketplace/Testimonial.jsx
try { (() => {
/**
 * LinX Testimonial — gold stars, an italic quote, and an author line.
 */
function Testimonial({
  rating = 5,
  quote,
  author,
  role,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-lg)",
      padding: "24px",
      boxSizing: "border-box",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--linx-gold)",
      fontSize: "12px",
      marginBottom: "10px",
      letterSpacing: "2px"
    }
  }, "★".repeat(rating)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "14px",
      color: "var(--text-secondary)",
      lineHeight: "var(--lh-relaxed)",
      marginBottom: "14px",
      fontStyle: "italic",
      marginTop: 0
    }
  }, quote), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "13px",
      fontWeight: 700,
      color: "var(--text-primary)"
    }
  }, author), role && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "12px",
      color: "var(--text-secondary)"
    }
  }, role));
}
Object.assign(__ds_scope, { Testimonial });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/marketplace/Testimonial.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Navbar.jsx
try { (() => {
/**
 * LinX Navbar — the sticky top bar: LinX wordmark, uppercase nav links,
 * and a gold CTA pill. Translucent dark with a blur.
 */
function Navbar({
  links = [],
  cta = "Get Started Free",
  onCta,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "var(--linx-nav-bg)",
      borderBottom: "1px solid var(--border-hairline)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 6%",
      height: "var(--nav-height)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "24px",
      fontWeight: 900,
      letterSpacing: "var(--ls-tightest)",
      display: "flex",
      alignItems: "center",
      background: "var(--linx-gold-foil)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      filter: "drop-shadow(0 1px 1px rgba(0,0,0,.5))"
    }
  }, "LinX"), /*#__PURE__*/React.createElement("ul", {
    style: {
      display: "flex",
      gap: "24px",
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, /*#__PURE__*/React.createElement("a", {
    href: typeof l === "string" ? "#" : l.href,
    style: {
      fontFamily: "var(--font-sans)",
      color: "var(--text-secondary)",
      textDecoration: "none",
      textTransform: "uppercase",
      letterSpacing: "var(--ls-wider)",
      fontSize: "12px",
      fontWeight: 500
    }
  }, typeof l === "string" ? l : l.label)))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    onClick: onCta
  }, cta));
}
Object.assign(__ds_scope, { Navbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Navbar.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * LinX Card — the base dark surface: near-black fill, hairline border,
 * 14px radius. On dark we lean on borders, not drop shadows. Set
 * `hoverable` to warm the border to gold and lift on hover.
 */
function Card({
  children,
  hoverable = false,
  padding = "24px",
  style = {},
  ...rest
}) {
  const [hover, setHover] = useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => hoverable && setHover(true),
    onMouseLeave: () => hoverable && setHover(false),
    style: {
      background: "var(--surface-card)",
      border: `1px solid ${hover ? "var(--linx-gold)" : "var(--border-hairline)"}`,
      borderRadius: "var(--radius-lg)",
      padding,
      transform: hover ? "translateY(-2px)" : "none",
      transition: "border-color var(--dur-base), transform var(--dur-base)",
      boxSizing: "border-box",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/FeatureCard.jsx
try { (() => {
const {
  useState
} = React;
/**
 * LinX FeatureCard — an emoji icon, bold title, description, and a
 * gold-checked feature list. Used in "Who LinX Serves" and feature grids.
 */
function FeatureCard({
  icon,
  title,
  description,
  features = [],
  style = {}
}) {
  const [hover, setHover] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: "var(--surface-card)",
      border: `1px solid ${hover ? "var(--linx-gold)" : "var(--border-hairline)"}`,
      borderRadius: "var(--radius-lg)",
      padding: "30px",
      transition: "border-color var(--dur-base)",
      boxSizing: "border-box",
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "28px",
      marginBottom: "12px"
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "20px",
      fontWeight: 800,
      marginBottom: "10px",
      color: "var(--text-primary)"
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "14px",
      color: "var(--text-secondary)",
      lineHeight: "var(--lh-relaxed)",
      marginBottom: features.length ? "18px" : 0
    }
  }, description), features.length > 0 && /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: "7px"
    }
  }, features.map((f, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "13px",
      color: "var(--text-secondary)",
      display: "flex",
      alignItems: "flex-start",
      gap: "8px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--linx-gold)",
      fontWeight: 700,
      flexShrink: 0
    }
  }, "\u2713"), f))));
}
Object.assign(__ds_scope, { FeatureCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/FeatureCard.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/PricingCard.jsx
try { (() => {
const {
  useState
} = React;
/**
 * LinX PricingCard — a plan tier. The `featured` tier gets a gold border
 * and a "MOST POPULAR" chip. Prices render with a gold dollar sign.
 */
function PricingCard({
  name,
  price,
  period = "per month",
  features = [],
  cta = "Get Started",
  ctaVariant,
  featured = false,
  onCta,
  style = {}
}) {
  const [hover, setHover] = useState(false);
  const borderColor = featured ? "var(--linx-gold)" : hover ? "var(--linx-gold-55)" : "var(--border-hairline)";
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: "relative",
      background: "var(--surface-card)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-lg)",
      padding: "28px 24px",
      transform: hover && !featured ? "translateY(-2px)" : "none",
      transition: "border-color var(--dur-base), transform var(--dur-base)",
      boxSizing: "border-box",
      ...style
    }
  }, featured && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "-13px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "var(--linx-gold)",
      color: "var(--text-on-gold)",
      fontSize: "10px",
      fontWeight: 800,
      letterSpacing: "var(--ls-widest)",
      padding: "4px 16px",
      borderRadius: "var(--radius-pill)",
      whiteSpace: "nowrap",
      textTransform: "uppercase",
      fontFamily: "var(--font-sans)"
    }
  }, "Most Popular"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "13px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.18em",
      color: "var(--text-secondary)",
      marginBottom: "6px"
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "42px",
      fontWeight: 900,
      color: "var(--text-primary)",
      letterSpacing: "var(--ls-tightest)",
      lineHeight: 1,
      marginBottom: "4px"
    }
  }, /*#__PURE__*/React.createElement("sup", {
    style: {
      fontSize: "18px",
      verticalAlign: "super",
      color: "var(--linx-gold)",
      letterSpacing: 0
    }
  }, "$"), price), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "13px",
      color: "var(--text-secondary)",
      marginBottom: "18px"
    }
  }, period), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: "16px 0 0",
      marginBottom: "22px",
      borderTop: "1px solid var(--border-hairline)",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }
  }, features.map((f, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "13px",
      color: "var(--text-secondary)",
      display: "flex",
      alignItems: "flex-start",
      gap: "8px",
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--linx-gold)",
      fontWeight: 700,
      flexShrink: 0
    }
  }, "\u2713"), f))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: ctaVariant || (featured ? "primary" : "outline"),
    block: true,
    onClick: onCta
  }, cta));
}
Object.assign(__ds_scope, { PricingCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/PricingCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/admin-app.jsx
try { (() => {
/* global React */
// LinX Admin — internal crawler & lead-intelligence dashboard.
// Slate + sky theme. Composes AdminStatCard / AdminBadge from the DS.
const {
  useState
} = React;
const {
  AdminStatCard,
  AdminBadge
} = window.LinXDesignSystem_1b8a1a;
const A = {
  bg: "var(--admin-bg)",
  surface: "var(--admin-surface)",
  soft: "var(--admin-surface-soft)",
  border: "var(--admin-border)",
  accent: "var(--admin-accent)",
  text: "var(--admin-text-primary)",
  muted: "var(--admin-text-secondary)"
};
function AdminBtn({
  children,
  variant = "outline",
  onClick,
  type = "button",
  full
}) {
  const styles = {
    primary: {
      background: A.accent,
      color: "#020617"
    },
    outline: {
      background: "transparent",
      color: A.text,
      border: `1px solid ${A.border}`
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    onClick: onClick,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: full ? "100%" : "auto",
      padding: "8px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: 500,
      fontFamily: "var(--font-sans)",
      border: "1px solid transparent",
      cursor: "pointer",
      ...styles[variant]
    }
  }, children);
}
function Login({
  onIn
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: A.bg
    }
  }, /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onIn();
    },
    style: {
      width: "100%",
      maxWidth: "360px",
      background: "rgba(15,23,42,.8)",
      border: `1px solid ${A.soft}`,
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "var(--shadow-admin)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "28px",
      width: "28px",
      borderRadius: "8px",
      background: "rgba(56,189,248,.2)",
      border: "1px solid rgba(56,189,248,.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: A.accent,
      fontSize: "12px",
      fontWeight: 700
    }
  }, "LX"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "11px",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: A.muted
    }
  }, "LinX Admin"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "17px",
      fontWeight: 600,
      color: A.text
    }
  }, "Sign in to dashboard"))), ["Username", "Password"].map(l => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      marginBottom: "14px"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      fontSize: "12px",
      fontWeight: 500,
      color: A.muted,
      marginBottom: "6px"
    }
  }, l), /*#__PURE__*/React.createElement("input", {
    type: l === "Password" ? "password" : "text",
    defaultValue: l === "Username" ? "darren" : "••••••••",
    style: {
      width: "100%",
      borderRadius: "8px",
      background: A.surface,
      border: `1px solid ${A.border}`,
      padding: "8px 12px",
      fontSize: "14px",
      color: A.text,
      boxSizing: "border-box",
      outline: "none",
      fontFamily: "var(--font-sans)"
    }
  }))), /*#__PURE__*/React.createElement(AdminBtn, {
    variant: "primary",
    type: "submit",
    full: true
  }, "Sign in")));
}
const CATS = [["Renovation", 42], ["Electrical", 31], ["Roofing", 24], ["Plumbing", 19], ["Landscaping", 14], ["HVAC", 9]];
const SRC = [["Kijiji", 38], ["HomeStars", 27], ["Facebook", 21], ["Referral", 14]];
const LEADS = [["Kitchen Renovation", "Toronto, ON", "Renovation", "Kijiji", "Active"], ["200A Panel Upgrade", "Calgary, AB", "Electrical", "HomeStars", "Active"], ["Roof Repair", "Vancouver, BC", "Roofing", "Facebook", "Active"], ["Bathroom Remodel", "Ottawa, ON", "Renovation", "Referral", "Expired"], ["Backyard Landscaping", "Barrie, ON", "Landscaping", "Kijiji", "Active"]];
function Bars({
  title,
  data,
  max
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(15,23,42,.8)",
      border: `1px solid ${A.soft}`,
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "var(--shadow-admin)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "13px",
      fontWeight: 600,
      color: A.text,
      marginBottom: "14px"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    }
  }, data.map(([label, v]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "92px",
      fontSize: "12px",
      color: A.muted,
      flexShrink: 0
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: "8px",
      background: A.surface,
      borderRadius: "4px",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${v / max * 100}%`,
      height: "100%",
      background: A.accent,
      borderRadius: "4px"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "24px",
      fontSize: "12px",
      color: A.text,
      textAlign: "right"
    }
  }, v)))));
}
function Dashboard({
  onOut
}) {
  const [crawling, setCrawling] = useState(true);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: A.bg,
      color: A.text
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      borderBottom: `1px solid ${A.soft}`,
      background: "rgba(2,6,23,.8)",
      position: "sticky",
      top: 0,
      zIndex: 10,
      backdropFilter: "blur(8px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "28px",
      width: "28px",
      borderRadius: "8px",
      background: "rgba(56,189,248,.2)",
      border: "1px solid rgba(56,189,248,.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: A.accent,
      fontSize: "12px",
      fontWeight: 700
    }
  }, "LX"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "14px",
      fontWeight: 600
    }
  }, "LinX Admin"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "12px",
      color: A.muted
    }
  }, "Crawler & Lead Intelligence"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "10px"
    }
  }, /*#__PURE__*/React.createElement(AdminBtn, null, "Refresh"), /*#__PURE__*/React.createElement(AdminBtn, {
    onClick: onOut
  }, "Sign out")))), /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "24px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "20px"
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: "14px"
    }
  }, /*#__PURE__*/React.createElement(AdminStatCard, {
    label: "Total Leads",
    value: "3,204",
    delta: 42
  }), /*#__PURE__*/React.createElement(AdminStatCard, {
    label: "Active Leads",
    value: "1,180",
    delta: 12,
    accent: "success"
  }), /*#__PURE__*/React.createElement(AdminStatCard, {
    label: "New Today",
    value: "42",
    accent: "accent"
  }), /*#__PURE__*/React.createElement(AdminStatCard, {
    label: "Expired Leads",
    value: "88",
    delta: -5,
    accent: "danger"
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: "16px",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }
  }, /*#__PURE__*/React.createElement(Bars, {
    title: "Leads by Category",
    data: CATS,
    max: 42
  }), /*#__PURE__*/React.createElement(Bars, {
    title: "Leads by Source",
    data: SRC,
    max: 38
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(15,23,42,.8)",
      border: `1px solid ${A.soft}`,
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "var(--shadow-admin)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "13px",
      fontWeight: 600,
      marginBottom: "12px"
    }
  }, "Crawler"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "14px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: crawling ? A.accent : A.muted
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "13px",
      color: A.muted
    }
  }, crawling ? "Running — 6 sources" : "Stopped")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "12px",
      color: A.muted,
      marginBottom: "16px",
      lineHeight: 1.6
    }
  }, "Last run 4 min ago \xB7 128 new records ingested this hour."), crawling ? /*#__PURE__*/React.createElement(AdminBtn, {
    full: true,
    onClick: () => setCrawling(false)
  }, "Stop Crawler") : /*#__PURE__*/React.createElement(AdminBtn, {
    variant: "primary",
    full: true,
    onClick: () => setCrawling(true)
  }, "Start Crawler"))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: "rgba(15,23,42,.8)",
      border: `1px solid ${A.soft}`,
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "var(--shadow-admin)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px",
      fontSize: "13px",
      fontWeight: 600,
      borderBottom: `1px solid ${A.soft}`
    }
  }, "Recent Leads"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "13px"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      color: A.muted,
      textAlign: "left"
    }
  }, ["Project", "Location", "Category", "Source", "Status"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "10px 16px",
      fontWeight: 500,
      fontSize: "11px",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      borderBottom: `1px solid ${A.soft}`
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, LEADS.map((l, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: A.text,
      borderBottom: `1px solid ${A.surface}`
    }
  }, l[0]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: A.muted,
      borderBottom: `1px solid ${A.surface}`
    }
  }, l[1]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: A.muted,
      borderBottom: `1px solid ${A.surface}`
    }
  }, l[2]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: A.muted,
      borderBottom: `1px solid ${A.surface}`
    }
  }, l[3]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      borderBottom: `1px solid ${A.surface}`
    }
  }, /*#__PURE__*/React.createElement(AdminBadge, {
    tone: l[4] === "Active" ? "success" : "muted"
  }, l[4])))))))));
}
function AdminApp() {
  const [authed, setAuthed] = useState(false);
  return authed ? /*#__PURE__*/React.createElement(Dashboard, {
    onOut: () => setAuthed(false)
  }) : /*#__PURE__*/React.createElement(Login, {
    onIn: () => setAuthed(true)
  });
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(AdminApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/admin-app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/marketing-app.jsx
try { (() => {
/* global React */
// LinX — Marketing site recreation. Composes the LinX design-system
// primitives into the full contractor-network landing page.
const {
  useState,
  useEffect,
  useRef
} = React;
const {
  Navbar,
  Button,
  SectionLabel,
  StatItem,
  Badge,
  LiveCard,
  StepItem,
  FeatureCard,
  Testimonial,
  PricingCard,
  FaqItem,
  Segmented,
  Field,
  Toast
} = window.LinXDesignSystem_1b8a1a;
const wrap = {
  maxWidth: "var(--container-max)",
  margin: "0 auto",
  padding: "0 var(--container-pad)"
};
const section = {
  padding: "var(--sp-section) 0"
};
const titleStyle = {
  fontSize: "var(--fs-title)",
  fontWeight: 800,
  lineHeight: 1.2,
  margin: "0 0 14px"
};
const subStyle = {
  fontSize: "15px",
  color: "var(--text-secondary)",
  maxWidth: "560px",
  lineHeight: 1.7,
  margin: 0
};
const raised = {
  background: "var(--surface-raised)",
  borderTop: "1px solid var(--border-hairline)",
  borderBottom: "1px solid var(--border-hairline)"
};
const carbonBg = {
  background: "var(--linx-carbon)",
  backgroundSize: "var(--linx-carbon-size)"
};
function CarbonSheen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--linx-carbon-sheen)",
      pointerEvents: "none"
    }
  });
}
function CarbonHost() {
  return null;
}
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "110px 0 80px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(CarbonSheen, null), /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      border: "1px solid var(--linx-gold-35)",
      color: "var(--linx-gold)",
      fontSize: "10px",
      fontWeight: 600,
      letterSpacing: "0.28em",
      textTransform: "uppercase",
      padding: "5px 16px",
      borderRadius: "999px",
      marginBottom: "32px",
      background: "rgba(0,0,0,.6)"
    }
  }, "Est. 2026 \u2014 Canada's Contractor Network"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "clamp(52px,7vw,80px)",
      fontWeight: 900,
      letterSpacing: "0.06em",
      margin: "0 0 22px",
      display: "inline-block",
      background: "var(--linx-gold-foil)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      filter: "drop-shadow(0 2px 3px rgba(0,0,0,.6))"
    }
  }, "LinX"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "15px",
      color: "var(--text-secondary)",
      maxWidth: "460px",
      margin: "0 auto 40px",
      lineHeight: 1.6
    }
  }, "Quiet automation for busy teams.", /*#__PURE__*/React.createElement("br", null), "SMS, CRM, and AI agents that just work."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "12px",
      justifyContent: "center",
      flexWrap: "wrap",
      marginBottom: "56px"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline-gold",
    href: "#contact"
  }, "Post a Project Free"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    href: "#contact"
  }, "Join as Contractor")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      border: "1px solid var(--border-hairline)",
      borderRadius: "14px",
      overflow: "hidden",
      background: "rgba(5,5,7,.9)"
    }
  }, [["1,400+", "Contractors"], ["3,200+", "Projects Posted"], ["97%", "Match Rate"], ["4.9 ★", "Avg Rating"]].map(([v, l], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      padding: "18px 12px",
      borderRight: i < 3 ? "1px solid var(--border-hairline)" : "none"
    }
  }, /*#__PURE__*/React.createElement(StatItem, {
    value: v,
    label: l
  }))))));
}
const FEED = [["🏠", "Kitchen Renovation", "Toronto, ON · CAD $22k–$30k · 2h ago", "Live", "success"], ["⚡", "Panel Upgrade — 200A", "Calgary, AB · CAD $4,500 · 4h ago", "New", "info"], ["🔧", "Roof Repair — Shingles", "Vancouver, BC · CAD $5,000 · 6h ago", "Hot", "error"], ["🚿", "Bathroom Remodel", "Ottawa, ON · CAD $12k–$18k · 8h ago", "New", "info"], ["🌳", "Backyard Landscaping", "Barrie, ON · CAD $6,000 · 10h ago", "Live", "success"], ["🏗️", "Basement Finishing", "Edmonton, AB · CAD $35k · 12h ago", "Hot", "error"]];
function LiveFeed() {
  return /*#__PURE__*/React.createElement("section", {
    style: raised
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      ...section
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "22px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionLabel, null, "Real-Time Activity"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...titleStyle,
      fontSize: "26px",
      margin: 0
    }
  }, "Live Project Feed")), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--linx-success)",
      textTransform: "uppercase",
      letterSpacing: "0.16em"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: "8px",
      height: "8px",
      background: "var(--linx-success)",
      borderRadius: "50%"
    }
  }), "Live")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
      gap: "12px"
    }
  }, FEED.map((f, i) => /*#__PURE__*/React.createElement(LiveCard, {
    key: i,
    icon: f[0],
    title: f[1],
    meta: f[2],
    badge: f[3],
    badgeTone: f[4]
  })))));
}
function HowItWorks() {
  const steps = [["1", "Post Your Project", "Describe your job in 30 seconds — what, when, and budget. Free for homeowners."], ["2", "Get Matched Instantly", "Our algorithm surfaces the best verified contractors in your city."], ["3", "Review Real Quotes", "Transparent quotes, no hidden fees. Verified reviews from your neighbours."], ["4", "Hire With Confidence", "Choose your contractor, agree on terms, get the job done."]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      ...section,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Simple Process"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...titleStyle,
      margin: "0 auto 14px"
    }
  }, "How LinX Works"), /*#__PURE__*/React.createElement("p", {
    style: {
      ...subStyle,
      margin: "0 auto"
    }
  }, "From posting a project to shaking hands on a quote \u2014 LinX makes every step effortless."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: "28px",
      marginTop: "48px"
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement(StepItem, {
    key: i,
    number: s[0],
    title: s[1],
    description: s[2]
  }))));
}
function WhoServes() {
  return /*#__PURE__*/React.createElement("section", {
    style: raised
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      ...section
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Built for Both Sides"), /*#__PURE__*/React.createElement("h2", {
    style: titleStyle
  }, "Who LinX Serves"), /*#__PURE__*/React.createElement("p", {
    style: subStyle
  }, "Whether you own a home or run a trade business, LinX is built specifically for you."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "22px",
      marginTop: "40px"
    }
  }, /*#__PURE__*/React.createElement(FeatureCard, {
    icon: "\uD83C\uDFE1",
    title: "Homeowners",
    description: "Stop scrolling through sketchy listings. LinX gives you instant access to verified, local professionals who care about their reputation.",
    features: ["Completely free — forever", "Verified contractors only", "Real reviews from real neighbours", "Transparent quotes, no bidding wars", "All trades: plumbers, electricians, roofers"]
  }), /*#__PURE__*/React.createElement(FeatureCard, {
    icon: "\uD83D\uDD28",
    title: "Contractors",
    description: "Stop chasing leads. LinX sends you qualified homeowners in your city who are ready to hire right now \u2014 no bidding wars, no wasted time.",
    features: ["Qualified leads delivered daily", "CRM to track your entire pipeline", "URL shortener with click analytics", "EchoForge automation marketplace", "Google Sheets sync for your data"]
  }))));
}
function Testimonials() {
  const t = [[5, "I found a roofer in 10 minutes. Posted my project, got 3 quotes by the next morning. LinX is exactly what this industry needed.", "Jennifer M.", "Homeowner · Barrie, ON"], [5, "I went from 3 leads a month to 12 in my first 30 days on LinX. The CRM keeps everything organized and the automated follow-ups save me hours.", "Mike T.", "Electrical Contractor · Calgary, AB"], [5, "We'd been burned by contractors before. LinX's verification process gave us real confidence. Our kitchen turned out beautifully.", "Sandra & Dave K.", "Homeowners · Toronto, ON"]];
  return /*#__PURE__*/React.createElement("section", {
    style: raised
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      ...section
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Client Stories"), /*#__PURE__*/React.createElement("h2", {
    style: titleStyle
  }, "What People Are Saying"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
      gap: "18px",
      marginTop: "40px"
    }
  }, t.map((x, i) => /*#__PURE__*/React.createElement(Testimonial, {
    key: i,
    rating: x[0],
    quote: `"${x[1]}"`,
    author: x[2],
    role: x[3]
  })))));
}
function Pricing() {
  const [annual, setAnnual] = useState(false);
  const plans = [{
    name: "Starter",
    m: 29,
    a: 23,
    features: ["100 shortened links", "Basic click analytics", "CRM up to 500 leads", "Google Sheets sync", "15% EchoForge commission"],
    cta: "Get Started",
    featured: false
  }, {
    name: "Pro",
    m: 79,
    a: 63,
    features: ["Unlimited shortened links", "Full analytics", "Unlimited CRM leads", "Sell on EchoForge", "Reduced 10% commission"],
    cta: "Subscribe Now",
    featured: true
  }, {
    name: "Enterprise",
    m: 199,
    a: 159,
    features: ["Everything in Pro", "API access", "White-label shortener", "Bulk automation uploads", "Lowest 5% commission"],
    cta: "Contact Us",
    featured: false
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      ...section
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, {
    style: {
      textAlign: "center"
    }
  }, "Transparent Pricing"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...titleStyle,
      textAlign: "center"
    }
  }, "Plans for Every Business"), /*#__PURE__*/React.createElement("p", {
    style: {
      ...subStyle,
      textAlign: "center",
      margin: "0 auto"
    }
  }, "Homeowners are always free. Contractors choose the plan that fits their growth stage."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      margin: "32px 0",
      fontSize: "13px",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("span", null, "Monthly"), /*#__PURE__*/React.createElement("div", {
    onClick: () => setAnnual(!annual),
    style: {
      width: "44px",
      height: "24px",
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "12px",
      position: "relative",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "18px",
      height: "18px",
      background: "var(--linx-gold)",
      borderRadius: "50%",
      position: "absolute",
      top: "3px",
      left: annual ? "23px" : "3px",
      transition: "left .2s"
    }
  })), /*#__PURE__*/React.createElement("span", null, "Annual ", /*#__PURE__*/React.createElement("span", {
    style: {
      background: "var(--linx-success-12)",
      color: "var(--linx-success)",
      fontSize: "11px",
      fontWeight: 700,
      padding: "3px 10px",
      borderRadius: "999px",
      textTransform: "uppercase",
      letterSpacing: "0.08em"
    }
  }, "Save 20%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: "18px"
    }
  }, plans.map((p, i) => /*#__PURE__*/React.createElement(PricingCard, {
    key: i,
    name: p.name,
    price: annual ? p.a : p.m,
    period: `per month, billed ${annual ? "annually" : "monthly"}`,
    features: p.features,
    cta: p.cta,
    featured: p.featured
  }))));
}
function Faq() {
  const items = [["Is LinX really free for homeowners?", "Yes — completely. Homeowners can post projects, receive quotes, read reviews, and hire without ever paying. LinX earns through contractor subscriptions and EchoForge commissions."], ["How are contractors verified?", "Every contractor goes through a profile review including business info, trade type, and service area. We encourage real reviews from past clients."], ["What trades does LinX cover?", "All major residential trades — plumbers, electricians, roofers, landscapers, general contractors, HVAC, painters, flooring, and more."], ["What is EchoForge?", "Our built-in automation marketplace. Contractors buy, remix, and sell workflow automations — from lead nurture sequences to social schedulers."], ["Can I cancel anytime?", "Yes. All plans are month-to-month (or annual with a 20% discount). Cancel anytime and keep access through your billing period."]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...raised,
      borderBottom: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      ...section
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Got Questions?"), /*#__PURE__*/React.createElement("h2", {
    style: titleStyle
  }, "Frequently Asked Questions"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "40px"
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement(FaqItem, {
    key: i,
    question: it[0],
    answer: it[1],
    defaultOpen: i === 0
  })))));
}
function Contact({
  onToast
}) {
  const [role, setRole] = useState("homeowner");
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...raised,
      borderBottom: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      ...section
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.1fr 1fr",
      gap: "52px",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionLabel, null, "Ready to Start?"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "30px",
      fontWeight: 800,
      marginBottom: "10px"
    }
  }, "Get In Touch"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "14px",
      color: "var(--text-secondary)",
      marginBottom: "26px",
      lineHeight: 1.7
    }
  }, "Whether you're a homeowner with a project or a contractor looking for quality leads \u2014 LinX is ready for you."), [["Phone", "705-716-0803"], ["Email", "Darrenethier991@gmail.com"], ["Owner", "Darren Ethier"], ["Platform", "linxservices.ca"]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "12px 0",
      borderBottom: "1px solid var(--border-hairline)",
      fontSize: "14px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-secondary)",
      fontSize: "11px",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.14em",
      width: "70px",
      flexShrink: 0
    }
  }, k), /*#__PURE__*/React.createElement("span", null, v)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Segmented, {
    value: role,
    onChange: setRole,
    style: {
      marginBottom: "20px"
    },
    options: [{
      label: "🏡 Homeowner",
      value: "homeowner"
    }, {
      label: "🔨 Contractor",
      value: "contractor"
    }]
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Your Name"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Phone",
    type: "tel"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    type: "email"
  }), role === "homeowner" ? /*#__PURE__*/React.createElement(Field, {
    label: "Describe Your Project",
    multiline: true
  }) : /*#__PURE__*/React.createElement(Field, {
    label: "Your Trade / Service"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true,
    style: {
      marginTop: "8px"
    },
    onClick: () => onToast("✓ Message sent! We'll be in touch shortly.")
  }, "Send Message")))));
}
function Footer() {
  const cols = [["Platform", ["How It Works", "For Homeowners", "For Contractors", "Pricing"]], ["Features", ["Lead Matching", "CRM Pipeline", "URL Shortener", "EchoForge"]], ["Company", ["FAQ", "Contact", "Support", "Partner With Us"]]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--surface-raised)",
      borderTop: "1px solid var(--border-hairline)",
      padding: "40px 0 22px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: wrap
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr",
      gap: "32px",
      marginBottom: "32px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "24px",
      fontWeight: 900,
      color: "var(--linx-gold)",
      letterSpacing: "-0.04em",
      marginBottom: "6px"
    }
  }, "LinX"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "12px",
      color: "var(--text-secondary)",
      marginBottom: "12px",
      fontStyle: "italic"
    }
  }, "\"Linking People Together\" \u2014 Est. 2026"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "13px",
      color: "var(--text-secondary)",
      lineHeight: 1.7,
      maxWidth: "280px",
      margin: 0
    }
  }, "Canada's Contractor Network. Built to connect homeowners with verified trades people across the country.")), cols.map(([h, links]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      fontSize: "11px",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.18em",
      color: "var(--text-secondary)",
      marginBottom: "12px"
    }
  }, h), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: "7px"
    }
  }, links.map(l => /*#__PURE__*/React.createElement("li", {
    key: l
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: "13px",
      color: "var(--text-secondary)",
      textDecoration: "none"
    }
  }, l))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--border-hairline)",
      paddingTop: "16px",
      display: "flex",
      justifyContent: "space-between",
      fontSize: "12px",
      color: "var(--text-secondary)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 LinX \u2014 Canada's Contractor Network."), /*#__PURE__*/React.createElement("span", null, "linxservices.ca"))));
}
function MarketingApp() {
  const [toast, setToast] = useState(null);
  function showToast(msg) {
    setToast(msg);
    clearTimeout(window.__t);
    window.__t = setTimeout(() => setToast(null), 4000);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...carbonBg,
      minHeight: "100vh"
    }
  }, /*#__PURE__*/React.createElement(Navbar, {
    links: ["How It Works", "Who It's For", "Pricing", "FAQ", "Contact"],
    cta: "Get Started Free",
    onCta: () => showToast("Welcome to LinX — let's get you set up.")
  }), /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(LiveFeed, null), /*#__PURE__*/React.createElement(HowItWorks, null), /*#__PURE__*/React.createElement(WhoServes, null), /*#__PURE__*/React.createElement(Testimonials, null), /*#__PURE__*/React.createElement(Pricing, null), /*#__PURE__*/React.createElement(Faq, null), /*#__PURE__*/React.createElement("div", {
    id: "contact"
  }, /*#__PURE__*/React.createElement(Contact, {
    onToast: showToast
  })), /*#__PURE__*/React.createElement(Footer, null), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: 9999
    }
  }, /*#__PURE__*/React.createElement(Toast, null, toast)));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(MarketingApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/marketing-app.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Toggle = __ds_scope.Toggle;

__ds_ns.AdminBadge = __ds_scope.AdminBadge;

__ds_ns.AdminStatCard = __ds_scope.AdminStatCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.SectionLabel = __ds_scope.SectionLabel;

__ds_ns.StatItem = __ds_scope.StatItem;

__ds_ns.FaqItem = __ds_scope.FaqItem;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Segmented = __ds_scope.Segmented;

__ds_ns.LiveCard = __ds_scope.LiveCard;

__ds_ns.StepItem = __ds_scope.StepItem;

__ds_ns.Testimonial = __ds_scope.Testimonial;

__ds_ns.Navbar = __ds_scope.Navbar;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.FeatureCard = __ds_scope.FeatureCard;

__ds_ns.PricingCard = __ds_scope.PricingCard;

})();
