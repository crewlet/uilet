# Blocks inside list items

1. Add the server to the company document:

   ```yaml
   mcp_servers:
     - name: mattermost
       command: npx
   ```

   It is pinned to a release ([see the catalogue](https://example.com/catalogue)).

2. Start the engine:

   ~~~sh
   crewlet run -config company.yaml

   # - a comment, not an item
   ~~~

10. A two-digit marker, whose content starts at column four:

    > A quote inside the item.

    | Field | Meaning |
    |---|---|
    | `name` | the server's name |

    ### A heading inside the item

    - a nested item
    - and another
      ```
      a fence in the nested item
      ```

- ```json
  {"first": "line of the item is a fence"}
  ```
- a lazy line
continues this item's paragraph
