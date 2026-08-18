#!/usr/bin/env python3
import os

def svg(path, title, bg, accent):
    content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <rect width="400" height="500" fill="{bg}"/>
  <rect x="40" y="60" width="320" height="340" rx="12" fill="{accent}" opacity="0.25"/>
  <circle cx="200" cy="160" r="50" fill="{accent}" opacity="0.4"/>
  <rect x="120" y="230" width="160" height="140" rx="8" fill="{accent}" opacity="0.35"/>
  <text x="200" y="460" text-anchor="middle" fill="#78716c" font-family="system-ui,sans-serif" font-size="13">{title}</text>
  <text x="200" y="480" text-anchor="middle" fill="#a8a29e" font-family="system-ui,sans-serif" font-size="10">Preset reference</text>
</svg>'''
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

base = "public/mock/photoshoot"

for name, title, bg, acc in [
    ("indian-fashion.svg", "Indian Fashion", "#fef3c7", "#d97706"),
    ("luxury-editorial.svg", "Luxury Editorial", "#1c1917", "#fafaf9"),
    ("casual-fashion.svg", "Casual Fashion", "#f5f5f4", "#78716c"),
    ("ecommerce.svg", "E-commerce", "#fafaf9", "#44403c"),
    ("custom.svg", "Custom Model", "#e7e5e4", "#57534e"),
]:
    svg(f"{base}/models/{name}", title, bg, acc)

for p in [
    "standing", "walking", "sitting", "side-profile", "back-view",
    "looking-at-camera", "looking-away", "hands-in-pocket",
    "full-body", "half-body", "close-up", "dynamic-fashion",
]:
    svg(f"{base}/poses/{p}.svg", p.replace("-", " ").title(), "#f5f5f4", "#292524")

for name, title, bg, acc in [
    ("clean-white.svg", "Clean White", "#ffffff", "#d6d3d1"),
    ("dark-luxury.svg", "Dark Luxury", "#292524", "#78716c"),
    ("minimal.svg", "Minimal", "#fafaf9", "#a8a29e"),
    ("editorial.svg", "Editorial", "#44403c", "#fafaf9"),
    ("cafe.svg", "Cafe", "#fef3c7", "#92400e"),
    ("street.svg", "Street", "#57534e", "#fafaf9"),
    ("home.svg", "Home", "#fef9c3", "#a16207"),
    ("office.svg", "Office", "#e7e5e4", "#44403c"),
    ("beach.svg", "Beach", "#bae6fd", "#0284c7"),
    ("hotel.svg", "Hotel", "#fde68a", "#78350f"),
    ("luxury-hotel.svg", "Luxury Hotel", "#1c1917", "#d6d3d1"),
    ("designer.svg", "Designer", "#fafaf9", "#1c1917"),
    ("high-fashion.svg", "High Fashion", "#44403c", "#fafaf9"),
    ("runway.svg", "Runway", "#0a0a0a", "#fafaf9"),
    ("palace.svg", "Palace", "#fef3c7", "#b45309"),
    ("wedding.svg", "Wedding", "#fce7f3", "#be185d"),
    ("festive.svg", "Festive", "#ffedd5", "#c2410c"),
    ("diwali.svg", "Diwali", "#fef08a", "#ca8a04"),
    ("traditional.svg", "Traditional", "#fed7aa", "#9a3412"),
]:
    svg(f"{base}/styles/{name}", title, bg, acc)

for name, title, bg, acc in [
    ("white-studio.svg", "White Studio", "#ffffff", "#e7e5e4"),
    ("black-studio.svg", "Black Studio", "#1c1917", "#44403c"),
    ("beige-studio.svg", "Beige Studio", "#f5f5f4", "#d6d3d1"),
    ("luxury-hotel.svg", "Luxury Hotel", "#292524", "#d6d3d1"),
    ("modern-apartment.svg", "Modern Apt", "#e7e5e4", "#78716c"),
    ("street.svg", "Street", "#57534e", "#fafaf9"),
    ("beach.svg", "Beach", "#7dd3fc", "#0369a1"),
    ("garden.svg", "Garden", "#bbf7d0", "#15803d"),
    ("palace.svg", "Palace", "#fde68a", "#b45309"),
    ("runway.svg", "Runway", "#0a0a0a", "#fafaf9"),
    ("custom.svg", "Custom", "#f5f5f4", "#a8a29e"),
]:
    svg(f"{base}/backgrounds/{name}", title, bg, acc)

print("Done")
