# Author - Viraj Purandare
# Created On - Oct 3, 2025

import json

# Read the sample files
f = open("org_prompt.txt", "r")
a = f.read()
f.close()

f = open("san_prompt.txt", "r")
b = f.read()
f.close()

print("Origninal Prompt")
print(a)

print("\n\nSanitized Prompt")
print(b)

# Technique 1 - Custom approach compatible to python llm-guard package
import re

def custom_for_llm_guard(a, b):
    redacted_items = re.findall(r'\[REDACTED_[A-Z_0-9]+\]', b)
    redacted_remainings = re.split(r'\[REDACTED_[A-Z_0-9]+\]', b)

    ptr = 0
    k = 0
    m = {}

    for i in range(len(redacted_remainings)):
        if redacted_remainings[i] == '':
            temp = ['', a]
        elif redacted_remainings[i] == ' ':
            temp = [' ', a]
        else:
            temp = a.split(redacted_remainings[i])

        if k >= len(redacted_items):
            break

        elif i + 1 < len(redacted_remainings):
            next_null = 1
            if redacted_remainings[i + 1] in ['', ' ']:
                for l in range(i + 1, len(redacted_remainings)):
                    if redacted_remainings[l] not in ['', ' ']:
                        m[redacted_items[k]] = temp[1].split(redacted_remainings[l])[0]
                        next_null = 0
                        break

                if next_null == 1:
                    m[redacted_items[k]] = temp[1]
            else:
                m[redacted_items[k]] = temp[1].split(redacted_remainings[i + 1])[0]
        else:
            m[redacted_items[k]] = temp[1]
    
        if redacted_remainings[i] != '':
            a = redacted_remainings[i].join(a.split(redacted_remainings[i])[1:])

        k += 1

    return m

# Technique 2 - Generic logic to find replacements in the 2 prompts
def generic_for_prompts_replacements(a, b): 
    anon_map_list = []

    org = a.strip().split(" ")
    san = b.split(" ")

    i = 0
    anonymity_map = {}
    for j in range(len(san)):
        if org[i] == san[j]:
            i += 1
            continue
        else:
            anon_key = "[" + "[".join("]".join(san[j].split("]")[:-1]).strip().split("[")[1:]).strip() + "]"
            anonymity_map[anon_key] = ""
            for k in range(j, len(org)):
                if (j + 1 == len(san)) or (org[k] != san[j + 1]):
                    anonymity_map[anon_key] += org[k] + " "
                else:
                    i = k
                    break

        anonymity_map[anon_key] = anonymity_map[anon_key].strip()
        anon_map_list.append([anon_key, anonymity_map[anon_key]])

        for anon_key_sec in anon_key.split("]"):
            if anon_key_sec != "":
                anonymity_map[anon_key_sec + "]"] = anonymity_map[anon_key]

    # Remove repetative patterns
    for i in range(len(anon_map_list)):
        next_anon_entries = []
        for j in range(i + 1, len(anon_map_list)):
            next_anon_entries += anon_map_list[j][1].split(" ")

        current_anon_entry = anon_map_list[i][1].split(" ")

        anonymity_map[anon_map_list[i][0]] = ""
        for word in current_anon_entry:
            if word not in next_anon_entries:
                anonymity_map[anon_map_list[i][0]] += word + " "
            else:
                break

        anonymity_map[anon_map_list[i][0]] = anonymity_map[anon_map_list[i][0]].strip()

    return anonymity_map

# Technique 3 - with difflib python package
import difflib
def find_replacements(original: str, anonymized: str):
    """
    Returns a list of tuples showing which parts of the original text were replaced in the anonymized version.
    Each tuple is (original_segment, replaced_segment).
    """
    matcher = difflib.SequenceMatcher(None, original, anonymized)
    replacements = {}

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'replace':
            original_segment = original[i1:i2]
            replaced_segment = anonymized[j1:j2]
            replacements[replaced_segment] = original_segment

    return replacements

print("\n\n# Custom logic for Python LLM Guard")
print(json.dumps(custom_for_llm_guard(a, b), indent = 3))

print("\n# Generic logic for prompt replacements")
print(json.dumps(generic_for_prompts_replacements(a, b), indent = 3))

print("\n Python difflib logic")
print(json.dumps(find_replacements(a, b), indent = 3))
